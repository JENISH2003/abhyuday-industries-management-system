import ActivityLog from '../models/ActivityLog';

interface LogOptions {
  userId: string | null;
  userName: string;
  action: string;
  module: 'Auth' | 'Certificate' | 'Meeting' | 'User' | 'System';
  details: string;
  ipAddress: string;
}

export const logActivity = async (options: LogOptions): Promise<void> => {
  try {
    const { userId, userName, action, module, details, ipAddress } = options;
    
    // Create the activity log document
    const log = new ActivityLog({
      userId: userId || 'SYSTEM',
      userName: userName || 'System Process',
      action,
      module,
      details,
      ipAddress: ipAddress || '127.0.0.1',
      timestamp: new Date(),
    });

    await log.save();
    console.log(`[AUDIT LOG] [${module}] [${action}] by ${userName} (IP: ${ipAddress}): ${details}`);
  } catch (error: any) {
    console.error(`CRITICAL: Audit log failed to write to database: ${error.message}`);
  }
};
