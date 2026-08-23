import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Certificate from '../models/Certificate';
import User from '../models/User';
import Category from '../models/Category';
import Subcategory from '../models/Subcategory';
import { CertificateValidator } from '../validators';
import { AuthenticatedRequest } from '../types';
import { sendMail } from '../services/emailService';
import { logActivity } from '../services/logService';
import fs from 'fs';
import path from 'path';

// Helper to compute discrete status strictly
export const computeCertificateStatus = (expiryDateInput: string | Date): 'active' | 'expiring_soon' | 'expired' => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateInput);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return 'expired';
  } else if (diffDays <= 90) {
    return 'expiring_soon';
  } else {
    return 'active';
  }
};

export const createCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedBody = CertificateValidator.parse(req.body);
    
    // Check duplicate certificate number only when provided
    const certificateNo = validatedBody.certificateNo?.trim() || '';
    if (certificateNo) {
      const certExists = await Certificate.findOne({ certificateNo });
      if (certExists) {
        return res.status(400).json({ message: 'Certificate number already exists' });
      }
    }

    // Auto-generate certificate name from subcategory/category if empty
    let name = validatedBody.name?.trim() || '';
    if (!name) {
      const subcat = await Subcategory.findById(validatedBody.subcategory);
      const cat = await Category.findById(validatedBody.category);
      if (subcat) {
        name = subcat.name;
      } else if (cat) {
        name = cat.name;
      } else {
        name = 'Compliance Certificate';
      }
    }

    // Determine strict status
    const status = computeCertificateStatus(validatedBody.expiryDate);

    const certificate = new Certificate({
      ...validatedBody,
      name,
      status,
      createdBy: req.user?.id,
    });

    await certificate.save();

    res.status(201).json({
      success: true,
      message: 'Certificate registered successfully',
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkCreateCertificates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { issuingAuthority, issueDate, expiryDate, remarks, certificates } = req.body;

    if (!issuingAuthority || !issueDate || !expiryDate || !Array.isArray(certificates) || certificates.length === 0) {
      return res.status(400).json({ message: 'Common supplier details, issue/expiry dates, and at least 1 certificate row are required.' });
    }

    // Validate category and subcategory ObjectIds for each item
    for (let i = 0; i < certificates.length; i++) {
      const c = certificates[i];
      if (!c.category || !mongoose.Types.ObjectId.isValid(c.category)) {
        return res.status(400).json({ message: `Row #${i + 1}: Valid Category is required.` });
      }
      if (!c.subcategory || !mongoose.Types.ObjectId.isValid(c.subcategory)) {
        return res.status(400).json({ message: `Row #${i + 1}: Valid Subcategory is required.` });
      }
    }

    // Check duplicate certificate numbers in database
    const certNos = certificates.map((c: any) => c.certificateNo?.trim()).filter(Boolean);
    if (certNos.length > 0) {
      const existingCerts = await Certificate.find({ certificateNo: { $in: certNos } }).select('certificateNo');
      if (existingCerts.length > 0) {
        const dupNos = existingCerts.map((c) => c.certificateNo).join(', ');
        return res.status(400).json({ message: `Duplicate certificate number(s) detected in system: ${dupNos}` });
      }
    }

    const computedStatus = computeCertificateStatus(expiryDate);

    const certDocsToInsert = certificates.map((c: any) => ({
      name: c.name?.trim() || '',
      category: c.category,
      subcategory: c.subcategory,
      certificateNo: c.certificateNo?.trim() || '',
      issuingAuthority: issuingAuthority.trim(),
      issueDate: new Date(issueDate),
      expiryDate: new Date(expiryDate),
      remarks: c.remarks || remarks || '',
      status: computedStatus,
      createdBy: req.user?.id,
    }));

    const insertedCertificates = await Certificate.insertMany(certDocsToInsert);

    // Send summary email notification if user email is present
    if (req.user?.email) {
      const certNames = insertedCertificates.map(c => `• ${c.name} (${c.certificateNo})`).join('\n');
      const subject = `[Abhyuday Summary] ${insertedCertificates.length} Certificates Successfully Registered`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
          <h2 style="color: #2563eb; margin-top: 0;">🎉 ${insertedCertificates.length} Certificates Registered</h2>
          <p>The following compliance documents were successfully added for supplier <strong>${issuingAuthority}</strong>:</p>
          <div style="background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0;">
            <pre style="font-family: Arial, sans-serif; margin: 0; white-space: pre-wrap;">${certNames}</pre>
          </div>
          <p style="font-size: 13px; color: #64748b;">Issue Date: ${issueDate} | Expiry Date: ${expiryDate}</p>
        </div>
      `;
      sendMail(req.user.email, subject, 'bulk_summary', htmlBody).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: `Successfully registered ${insertedCertificates.length} certificates!`,
      certificates: insertedCertificates,
    });
  } catch (error) {
    next(error);
  }
};

export const getCertificateStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const certQuery: any = {};
    if (req.user?.role !== 'super_admin') {
      certQuery.createdBy = req.user?.id;
    }

    const certificates = await Certificate.find(certQuery);
    let total = certificates.length;
    let active = 0;
    let warning = 0;
    let expired = 0;

    certificates.forEach((cert) => {
      const computedStatus = computeCertificateStatus(cert.expiryDate);
      if (computedStatus === 'expired') {
        expired++;
      } else if (computedStatus === 'expiring_soon') {
        warning++;
      } else {
        active++;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        active,
        warning,
        expired,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCertificates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const categoryId = (req.query.category as string || '').trim();
    const subcategoryId = (req.query.subcategory as string || '').trim();
    const daysRange = (req.query.daysRange as string || '').trim();
    const sortBy = (req.query.sortBy as string || 'expiryDate').trim();
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const query: any = {};

    // Strict Logged-in User Certificate Filtering
    if (req.user?.role !== 'super_admin') {
      query.createdBy = req.user?.id;
    }

    // Global Search across fields
    if (search) {
      const matchingCategories = await Category.find({ name: { $regex: search, $options: 'i' } }).select('_id');
      const matchingSubcategories = await Subcategory.find({ name: { $regex: search, $options: 'i' } }).select('_id');
      
      const searchConditions: any[] = [
        { name: { $regex: search, $options: 'i' } },
        { certificateNo: { $regex: search, $options: 'i' } },
        { issuingAuthority: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
      ];

      if (matchingCategories.length > 0) {
        searchConditions.push({ category: { $in: matchingCategories.map(c => c._id) } });
      }
      if (matchingSubcategories.length > 0) {
        searchConditions.push({ subcategory: { $in: matchingSubcategories.map(s => s._id) } });
      }

      if (query.createdBy) {
        const userFilter = { createdBy: query.createdBy };
        delete query.createdBy;
        query.$and = [
          userFilter,
          { $or: searchConditions }
        ];
      } else {
        query.$or = searchConditions;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const warningThresholdDate = new Date(today);
    warningThresholdDate.setDate(today.getDate() + 90);
    warningThresholdDate.setHours(23, 59, 59, 999);

    // Status filter - Strict 3-Bucket Discrete Classification
    if (status) {
      if (status === 'active') {
        query.expiryDate = { $gt: warningThresholdDate };
      } else if (status === 'expiring_soon' || status === 'warning') {
        query.expiryDate = { $gte: today, $lte: warningThresholdDate };
      } else if (status === 'expired') {
        query.expiryDate = { $lt: today };
      }
    }

    // Category filter
    if (categoryId) {
      query.category = categoryId;
    }

    // Subcategory filter
    if (subcategoryId) {
      query.subcategory = subcategoryId;
    }

    // Days remaining range filter
    if (daysRange) {
      const getBoundaries = (minD: number, maxD: number) => {
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + minD);
        minDate.setHours(0, 0, 0, 0);

        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + maxD);
        maxDate.setHours(23, 59, 59, 999);

        return { $gte: minDate, $lte: maxDate };
      };

      if (daysRange === '0') {
        query.expiryDate = { $lt: today };
      } else if (daysRange === '1') {
        query.expiryDate = getBoundaries(0, 1);
      } else if (daysRange === '7') {
        query.expiryDate = getBoundaries(2, 7);
      } else if (daysRange === '30') {
        query.expiryDate = getBoundaries(8, 30);
      } else if (daysRange === '60') {
        query.expiryDate = getBoundaries(31, 60);
      } else if (daysRange === '90') {
        query.expiryDate = getBoundaries(61, 90);
      }
    }

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder;

    const total = await Certificate.countDocuments(query);
    const certificates = await Certificate.find(query)
      .populate('createdBy', 'name email role')
      .populate('category', 'name color icon status')
      .populate('subcategory', 'name status')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit);

    // Dynamic status sync and name fallback on payload
    const sanitizedCertificates = certificates.map((cert) => {
      const computed = computeCertificateStatus(cert.expiryDate);
      if (cert.status !== computed) {
        cert.status = computed;
      }
      if (!cert.name || cert.name.trim() === '') {
        const catName = (cert.category as any)?.name || 'Compliance';
        const subName = (cert.subcategory as any)?.name;
        cert.name = subName ? `${catName} - ${subName}` : `${catName} Certificate`;
      }
      return cert;
    });

    res.status(200).json({
      success: true,
      certificates: sanitizedCertificates,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCertificateById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('category', 'name color icon')
      .populate('subcategory', 'name');
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (req.user?.role !== 'super_admin' && certificate.createdBy._id.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied: You can only view your own certificates.' });
    }

    certificate.status = computeCertificateStatus(certificate.expiryDate);

    res.status(200).json({ success: true, certificate });
  } catch (error) {
    next(error);
  }
};

export const updateCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedBody = CertificateValidator.parse(req.body);
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (req.user?.role !== 'super_admin' && certificate.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied: You can only modify your own certificates.' });
    }

    const newCertificateNo = validatedBody.certificateNo?.trim() || '';
    const existingCertificateNo = certificate.certificateNo?.trim() || '';
    if (newCertificateNo && newCertificateNo !== existingCertificateNo) {
      const duplicateExists = await Certificate.findOne({ certificateNo: newCertificateNo });
      if (duplicateExists) {
        return res.status(400).json({ message: 'New certificate number already exists' });
      }
    }

    // Re-compute strict status
    const newStatus = computeCertificateStatus(validatedBody.expiryDate);

    // Reset resolution and milestone alerts if renewed or updated to future date
    const isExpiryDateChanged = new Date(certificate.expiryDate).getTime() !== new Date(validatedBody.expiryDate).getTime();
    if (isExpiryDateChanged || newStatus !== 'expired') {
      certificate.sentMilestones = [];
      certificate.isResolved = false;
      certificate.resolvedAt = null;
    }

    // Update fields
    certificate.name = validatedBody.name;
    certificate.category = validatedBody.category as any;
    certificate.subcategory = validatedBody.subcategory as any;
    certificate.certificateNo = validatedBody.certificateNo;
    certificate.issuingAuthority = validatedBody.issuingAuthority;
    certificate.issueDate = validatedBody.issueDate;
    certificate.expiryDate = validatedBody.expiryDate;
    certificate.folderPath = validatedBody.folderPath;
    certificate.remarks = validatedBody.remarks;
    certificate.status = newStatus;

    await certificate.save();

    res.status(200).json({
      success: true,
      message: 'Certificate updated successfully',
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (req.user?.role !== 'super_admin' && certificate.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied: You can only delete your own certificates.' });
    }

    // Delete file from disk if path exists
    if (certificate.fileUrl) {
      const filePath = path.resolve(__dirname, '../../', certificate.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {}
      }
    }

    await Certificate.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Certificate deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleResolveCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (req.user?.role !== 'super_admin' && certificate.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied: You can only modify your own certificates.' });
    }

    certificate.isResolved = !certificate.isResolved;
    certificate.resolvedAt = certificate.isResolved ? new Date() : null;

    await certificate.save();

    res.status(200).json({
      success: true,
      message: certificate.isResolved
        ? 'Certificate marked as Process Ongoing. Expiration email alerts suppressed.'
        : 'Certificate marked as Active. Email alerts re-enabled.',
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

export const renewCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { expiryDate } = req.body;

    if (!expiryDate) {
      return res.status(400).json({ message: 'Please select a valid future expiry date.' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (req.user?.role !== 'super_admin' && certificate.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied: You can only renew your own certificates.' });
    }

    const newExpiry = new Date(expiryDate);
    const newStatus = computeCertificateStatus(newExpiry);

    certificate.expiryDate = newExpiry;
    certificate.status = newStatus;
    certificate.sentMilestones = [];
    certificate.isResolved = false;
    certificate.resolvedAt = null;

    await certificate.save();

    await logActivity({
      userId: req.user?.id || null,
      userName: req.user?.name || 'User',
      action: 'Renew Certificate',
      module: 'Certificate',
      details: `Renewed expiry date for certificate "${certificate.name}" (${certificate.certificateNo}) to ${expiryDate}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: `Certificate "${certificate.name}" renewed successfully! New expiry: ${expiryDate}`,
      certificate,
    });
  } catch (error) {
    next(error);
  }
};
