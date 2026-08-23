import mongoose from 'mongoose';
import { config } from '../config/env';
import User from '../models/User';
import Category from '../models/Category';
import Subcategory from '../models/Subcategory';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop legacy/obsolete index on refreshtokens collection to prevent E11000 token_1 duplicate key error
    try {
      await mongoose.connection.collection('refreshtokens').dropIndex('token_1');
      console.log('[DB INDEX FIX] Dropped legacy refreshtokens token_1 index successfully.');
    } catch (indexErr) {}

    // Run seeding
    await seedSuperAdmin();
    await seedCategoriesAndSubcategories();
  } catch (error: any) {
    console.error(`Primary Database Connection Error (${config.MONGODB_URI}): ${error.message}`);
    
    // Fallback to local MongoDB if remote connection fails or times out
    const localUri = 'mongodb://127.0.0.1:27017/abhyuday_management';
    if (config.MONGODB_URI !== localUri) {
      console.log(`Attempting fallback connection to local MongoDB (${localUri})...`);
      try {
        const localConn = await mongoose.connect(localUri, {
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`MongoDB Connected (Local Fallback): ${localConn.connection.host}`);
        await seedSuperAdmin();
        await seedCategoriesAndSubcategories();
        return;
      } catch (localError: any) {
        console.error(`Local Fallback Database Connection Error: ${localError.message}`);
      }
    }
    
    process.exit(1);
  }
};

const seedSuperAdmin = async (): Promise<void> => {
  try {
    const email = config.SUPERADMIN_EMAIL || 'jenishkpatel2003@gmail.com';
    const password = config.SUPERADMIN_PASSWORD;

    if (!email || !password) {
      console.error('Failed to seed Super Admin: SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD is empty in .env');
      return;
    }

    // Remove legacy or obsolete super_admin accounts (e.g. superadmin@abhyuday.com)
    await User.deleteMany({ role: 'super_admin', email: { $ne: email } });
    await User.deleteMany({ email: 'superadmin@abhyuday.com' });

    // Check if target Super Admin exists
    let superAdmin = await User.findOne({ email });

    if (!superAdmin) {
      console.log(`Seeding primary Super Admin (${email})...`);
      superAdmin = new User({
        name: 'Jenish Patel',
        email,
        password,
        role: 'super_admin',
        status: 'active',
        isVerified: true,
      });
      await superAdmin.save();
      console.log(`Primary Super Admin successfully created: ${email}`);
    } else {
      let modified = false;
      if (superAdmin.role !== 'super_admin') {
        superAdmin.role = 'super_admin';
        modified = true;
      }
      if (superAdmin.status !== 'active') {
        superAdmin.status = 'active';
        modified = true;
      }
      // Always sync password if updated in .env
      const isPassMatch = await superAdmin.comparePassword(password);
      if (!isPassMatch) {
        superAdmin.password = password;
        modified = true;
      }
      if (modified) {
        await superAdmin.save();
        console.log(`Updated Super Admin credentials for: ${email}`);
      } else {
        console.log(`Super Admin ready: ${email}`);
      }
    }
  } catch (error: any) {
    console.error(`Error seeding Super Admin: ${error.message}`);
  }
};

const seedCategoriesAndSubcategories = async (): Promise<void> => {
  try {
    const categoryCount = await Category.countDocuments();
    if (categoryCount > 0) {
      console.log('Categories already seeded.');
      return;
    }

    console.log('Seeding default categories & subcategories for Psyllium Industry...');

    const defaults = [
      {
        name: 'Certifications',
        color: '#3B82F6',
        icon: 'Award',
        subcategories: ['FSSAI', 'BRCGS', 'ISO 22000', 'HACCP', 'Kosher', 'Halal', 'Organic', 'GMP', 'Sedex', 'FDA', 'APEDA']
      },
      {
        name: 'Laboratory Certificates',
        color: '#10B981',
        icon: 'FlaskConical',
        subcategories: ['Pesticide Residue', 'Heavy Metals', 'Microbiology', 'Aflatoxin', 'Salmonella', 'Yeast & Mold', 'Moisture Analysis', 'Purity Analysis', 'Viscosity Report', 'Mesh Size Analysis']
      },
      {
        name: 'Product Specifications',
        color: '#8B5CF6',
        icon: 'FileSpreadsheet',
        subcategories: ['Psyllium Husk', 'Psyllium Powder', 'Psyllium Seeds', 'Psyllium Industrial Grade', 'Psyllium Feed Grade']
      },
      {
        name: 'Customer Documents',
        color: '#EC4899',
        icon: 'UserCheck',
        subcategories: ['COA', 'MSDS', 'Specification Sheet', 'Technical Data Sheet', 'Product Brochure']
      },
      {
        name: 'Export Documents',
        color: '#F59E0B',
        icon: 'Globe',
        subcategories: ['Phytosanitary Certificate', 'Certificate of Origin', 'Bill of Lading', 'Packing List', 'Commercial Invoice', 'Shipping Documents']
      },
      {
        name: 'Machine & Calibration Records',
        color: '#6B7280',
        icon: 'Settings',
        subcategories: ['Weighing Scale Calibration', 'Metal Detector Calibration', 'Moisture Meter Calibration', 'Sieve Calibration', 'Equipment Validation']
      },
      {
        name: 'Internal Audit Records',
        color: '#EF4444',
        icon: 'ShieldAlert',
        subcategories: ['Internal Audit', 'CAPA', 'Non-Conformance', 'Corrective Action', 'Preventive Action']
      },
      {
        name: 'Employee Training Records',
        color: '#06B6D4',
        icon: 'GraduationCap',
        subcategories: ['GMP Training', 'HACCP Training', 'Safety Training', 'Hygiene Training', 'Fire Drill Training']
      },
      {
        name: 'Supplier Documents',
        color: '#14B8A6',
        icon: 'Truck',
        subcategories: ['Vendor Approval', 'Supplier Audit', 'Supplier Agreement', 'Raw Material Specification']
      },
      {
        name: 'Meetings',
        color: '#6366F1',
        icon: 'Calendar',
        subcategories: ['Management Review Meeting', 'Production Meeting', 'Quality Meeting', 'Customer Meeting', 'Supplier Meeting']
      }
    ];

    for (const item of defaults) {
      const category = new Category({
        name: item.name,
        color: item.color,
        icon: item.icon,
        status: 'active'
      });
      await category.save();

      for (const subName of item.subcategories) {
        const subcategory = new Subcategory({
          name: subName,
          category: category._id,
          status: 'active'
        });
        await subcategory.save();
      }
    }

    console.log('Categories and subcategories successfully seeded!');
  } catch (error: any) {
    console.error(`Error seeding categories/subcategories: ${error.message}`);
  }
};

