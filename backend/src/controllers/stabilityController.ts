import { Response, NextFunction } from 'express';
import StabilityRecord from '../models/StabilityRecord';
import User from '../models/User';
import { CreateStabilityRecordValidator, CompleteStabilityIntervalValidator } from '../validators';
import { AuthenticatedRequest } from '../types';
import { logActivity } from '../services/logService';

/**
 * Calculates due date for a stability interval (startDate + months)
 */
export const calculateIntervalDueDate = (startDateInput: Date | string, monthsToAdd: number): Date => {
  const date = new Date(startDateInput);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
};

/**
 * Get all stability records with populated createdBy & completedBy
 */
export const getStabilityRecords = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const query: any = {};
    if (req.user?.role !== 'super_admin') {
      query.createdBy = req.user?.id;
    }

    const records = await StabilityRecord.find(query)
      .populate('createdBy', 'name email role')
      .populate('history.completedBy', 'name email role')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new Product Stability Record
 */
export const createStabilityRecord = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedBody = CreateStabilityRecordValidator.parse(req.body);

    const firstIntervalMonths = 3;
    const firstIntervalLabel = '3M';
    const firstDueDate = calculateIntervalDueDate(validatedBody.stabilityStartDate, firstIntervalMonths);

    const record = new StabilityRecord({
      ...validatedBody,
      currentIntervalMonths: firstIntervalMonths,
      currentIntervalLabel: firstIntervalLabel,
      currentDueDate: firstDueDate,
      status: 'ongoing',
      sentOneDayBefore: false,
      sentOnDueDate: false,
      createdBy: req.user?.id,
      history: [],
    });

    await record.save();

    const populatedRecord = await StabilityRecord.findById(record._id)
      .populate('createdBy', 'name email');

    // Audit Log
    const currentUser = await User.findById(req.user?.id);
    await logActivity({
      userId: req.user?.id || null,
      userName: currentUser?.name || 'Operator',
      action: 'Create Stability Study',
      module: 'System',
      details: `Registered stability study for "${validatedBody.productName}" (Batch: ${validatedBody.batchNumber})`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json({
      success: true,
      message: 'Product Stability Study registered successfully',
      record: populatedRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark current stability interval as COMPLETED.
 * - Stops future emails for completed interval
 * - Saves completed entry in history audit trail
 * - Automatically advances to the next 3-month interval (e.g. 3M -> 6M -> 9M...) until stabilityEndDate is reached
 */
export const completeStabilityInterval = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validatedBody = CompleteStabilityIntervalValidator.parse(req.body);

    const record = await StabilityRecord.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'Stability study record not found' });
    }

    if (req.user?.role !== 'super_admin' && record.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied: You can only modify your own stability records.' });
    }

    if (record.status === 'completed') {
      return res.status(400).json({ message: 'This stability study is already fully completed.' });
    }

    const currentUser = await User.findById(req.user?.id);
    const completedByName = currentUser?.name || 'System Operator';

    const completedIntervalLabel = record.currentIntervalLabel;
    const completedDueDate = record.currentDueDate;

    // Push completed entry into immutable history audit log
    record.history.push({
      interval: completedIntervalLabel,
      dueDate: completedDueDate,
      completedDate: validatedBody.completedDate || new Date(),
      completedBy: req.user?.id as any,
      completedByName,
      remarks: validatedBody.remarks || '',
      fileName: validatedBody.fileName || '',
      fileUrl: validatedBody.fileUrl || '',
      folderPath: validatedBody.folderPath || '',
      createdAt: new Date(),
    });

    // Handle user action choice
    if (validatedBody.actionType === 'finish_study') {
      // Mark entire study as Finished immediately (stops future emails)
      record.status = 'finished';
    } else {
      // Strict 3-Month Interval Cycle for 36-Month Study (12 total checks: 3M, 6M, 9M, 12M, 15M, 18M, 21M, 24M, 27M, 30M, 33M, 36M)
      const nextMonths = record.currentIntervalMonths + 3;
      const nextDueDate = calculateIntervalDueDate(record.stabilityStartDate, nextMonths);

      // Normalize dates for comparison (midnight)
      const endDate = new Date(record.stabilityEndDate);
      endDate.setHours(23, 59, 59, 999);

      if (nextDueDate <= endDate) {
        record.currentIntervalMonths = nextMonths;
        record.currentIntervalLabel = `${nextMonths}M`;
        record.currentDueDate = nextDueDate;
        record.sentOneDayBefore = false;
        record.sentOnDueDate = false;
      } else {
        // Reached or passed 36-Month stability end date!
        record.status = 'finished';
      }
    }

    await record.save();

    const updatedRecord = await StabilityRecord.findById(record._id)
      .populate('createdBy', 'name email')
      .populate('history.completedBy', 'name email');

    await logActivity({
      userId: req.user?.id || null,
      userName: completedByName,
      action: validatedBody.actionType === 'finish_study' ? 'Finish Stability Study' : 'Complete Stability Interval',
      module: 'System',
      details: validatedBody.actionType === 'finish_study'
        ? `Completed ${completedIntervalLabel} interval and marked stability study for "${record.productName}" (Batch: ${record.batchNumber}) as FINISHED`
        : `Completed ${completedIntervalLabel} stability interval for "${record.productName}" (Batch: ${record.batchNumber})`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: record.status === 'finished'
        ? `Interval ${completedIntervalLabel} completed. Stability study for "${record.productName}" is now FINISHED and email alerts are stopped!`
        : `Interval ${completedIntervalLabel} completed. Next 3-month interval (${record.currentIntervalLabel}) scheduled!`,
      record: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revert / Undo the last completed stability interval.
 * Restores the record back to ongoing status for that interval.
 */
export const revertStabilityInterval = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const record = await StabilityRecord.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'Stability study record not found' });
    }

    if (!record.history || record.history.length === 0) {
      return res.status(400).json({ message: 'No completed stability intervals to revert.' });
    }

    // Pop the last completed entry from history
    const revertedItem = record.history.pop();

    // Recalculate pending interval state
    if (record.history.length === 0) {
      // Reverted back to the initial 3-month interval
      record.currentIntervalMonths = 3;
      record.currentIntervalLabel = '3M';
      record.currentDueDate = calculateIntervalDueDate(record.stabilityStartDate, 3);
    } else {
      // Reverted to the interval following the last remaining history entry
      const lastCompleted = record.history[record.history.length - 1];
      const match = lastCompleted.interval.match(/\d+/);
      const lastMonths = match ? parseInt(match[0], 10) : 3;
      const revertedMonths = lastMonths + 3;

      record.currentIntervalMonths = revertedMonths;
      record.currentIntervalLabel = `${revertedMonths}M`;
      record.currentDueDate = calculateIntervalDueDate(record.stabilityStartDate, revertedMonths);
    }

    record.status = 'ongoing';
    record.sentOneDayBefore = false;
    record.sentOnDueDate = false;

    await record.save();

    const currentUser = await User.findById(req.user?.id);
    await logActivity({
      userId: req.user?.id || null,
      userName: currentUser?.name || 'Operator',
      action: 'Revert Stability Interval',
      module: 'System',
      details: `Reverted ${revertedItem?.interval || ''} stability interval for "${record.productName}" (Batch: ${record.batchNumber}) back to pending`,
      ipAddress: req.ip || '127.0.0.1',
    });

    const updatedRecord = await StabilityRecord.findById(record._id)
      .populate('createdBy', 'name email')
      .populate('history.completedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Successfully reverted interval ${revertedItem?.interval || ''} back to active pending status!`,
      record: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a stability record (Super Admin / Admin only)
 */
export const deleteStabilityRecord = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const record = await StabilityRecord.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'Stability study record not found' });
    }

    await StabilityRecord.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Stability study record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
