import { Response, NextFunction } from 'express';
import { logActivity } from '../services/logService';
import { AuthenticatedRequest } from '../types';

const getFriendlyAuditLog = (req: AuthenticatedRequest, resStatus: number, bodyData: any) => {
  const method = req.method.toUpperCase();
  const url = req.originalUrl || req.path || '';
  const isSuccess = resStatus >= 200 && resStatus < 300;
  
  let module: 'Auth' | 'Certificate' | 'Meeting' | 'User' | 'System' = 'System';
  let action = 'System Update';
  let details = '';

  // Determine base human action fallback from HTTP verb
  if (method === 'POST') action = 'Create Record';
  else if (method === 'PUT' || method === 'PATCH') action = 'Update Record';
  else if (method === 'DELETE') action = 'Delete Record';

  // 1. Auth & Security Module
  if (url.includes('/auth') || url.includes('/profile')) {
    module = 'Auth';
    if (url.includes('/login')) {
      action = 'User Sign In';
      details = isSuccess 
        ? `User signed in successfully.` 
        : `Failed sign-in attempt for email: ${req.body?.email || 'Unknown'}.`;
    } else if (url.includes('/register')) {
      action = 'Account Registration';
      details = isSuccess 
        ? `New account created for email: ${req.body?.email || 'Unknown'}.`
        : `Failed to create new account.`;
    } else if (url.includes('/logout')) {
      action = 'User Sign Out';
      details = `User signed out of their session.`;
    } else if (url.includes('/change-password')) {
      action = 'Password Change';
      details = isSuccess 
        ? `User successfully changed their password.` 
        : `Failed password change attempt.`;
    } else {
      action = 'Profile Update';
      details = isSuccess ? `User updated their account profile details.` : `Failed to update profile.`;
    }
  }
  // 2. Certificate Module
  else if (url.includes('/certificates')) {
    module = 'Certificate';
    const certName = bodyData?.certificate?.name || req.body?.name || 'Certificate';
    if (method === 'POST') {
      action = 'Add Certificate';
      details = isSuccess 
        ? `Added new certificate: "${certName}".`
        : `Failed to add certificate. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'Update Certificate';
      details = isSuccess 
        ? `Updated certificate details for: "${certName}".`
        : `Failed to update certificate. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'DELETE') {
      action = 'Delete Certificate';
      details = isSuccess 
        ? `Deleted certificate record.`
        : `Failed to delete certificate. (${bodyData?.message || 'Error occurred'})`;
    }
  }
  // 3. Meeting Module
  else if (url.includes('/meetings')) {
    module = 'Meeting';
    const meetTitle = bodyData?.meeting?.title || req.body?.title || 'Meeting';
    if (method === 'POST') {
      action = 'Schedule Meeting';
      details = isSuccess 
        ? `Scheduled meeting: "${meetTitle}".`
        : `Failed to schedule meeting. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'Update Meeting';
      details = isSuccess 
        ? `Updated meeting schedule: "${meetTitle}".`
        : `Failed to update meeting. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'DELETE') {
      action = 'Cancel Meeting';
      details = isSuccess 
        ? `Cancelled scheduled meeting.`
        : `Failed to cancel meeting. (${bodyData?.message || 'Error occurred'})`;
    }
  }
  // 4. Category Module
  else if (url.includes('/categories')) {
    module = 'System';
    const catName = bodyData?.category?.name || req.body?.name || 'Category';
    if (method === 'POST') {
      action = 'Create Folder';
      details = isSuccess 
        ? `Created new category folder: "${catName}".`
        : `Failed to create folder. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'Update Folder';
      details = isSuccess 
        ? `Updated category folder: "${catName}".`
        : `Failed to update folder. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'DELETE') {
      action = 'Delete Folder';
      details = isSuccess 
        ? `Deleted category folder and its subcategories.`
        : `Failed to delete folder. (${bodyData?.message || 'Error occurred'})`;
    }
  }
  // 5. Subcategory Module
  else if (url.includes('/subcategories')) {
    module = 'System';
    const subName = bodyData?.subcategory?.name || req.body?.name || 'Subcategory';
    if (method === 'POST') {
      action = 'Create Subcategory';
      details = isSuccess 
        ? `Added subcategory: "${subName}".`
        : `Failed to add subcategory. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'Update Subcategory';
      details = isSuccess 
        ? `Updated subcategory: "${subName}".`
        : `Failed to update subcategory. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'DELETE') {
      action = 'Delete Subcategory';
      details = isSuccess 
        ? `Deleted subcategory.`
        : `Failed to delete subcategory. (${bodyData?.message || 'Error occurred'})`;
    }
  }
  // 6. User Management Module
  else if (url.includes('/users')) {
    module = 'User';
    const targetUser = bodyData?.user?.email || req.body?.email || 'User Account';
    if (method === 'POST') {
      action = 'Create User Account';
      details = isSuccess 
        ? `Created user account for: ${targetUser}.`
        : `Failed to create user. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'Update User Details';
      details = isSuccess 
        ? `Updated user account settings.`
        : `Failed to update user. (${bodyData?.message || 'Error occurred'})`;
    } else if (method === 'DELETE') {
      action = 'Delete User Account';
      details = isSuccess 
        ? `Deleted user account.`
        : `Failed to delete user. (${bodyData?.message || 'Error occurred'})`;
    }
  }
  // 7. Backup & Restore Module
  else if (url.includes('/db') || url.includes('/backup')) {
    module = 'System';
    if (url.includes('/backup')) {
      action = 'Download Backup';
      details = isSuccess ? `Downloaded full system database backup file.` : `Failed database backup export.`;
    } else if (url.includes('/restore')) {
      action = 'Restore Database';
      details = isSuccess ? `Restored database data from backup file.` : `Failed database restore.`;
    }
  }

  // Clean human fallback for any general logs (NO HTTP VERBS or RAW URLs)
  if (!details) {
    details = isSuccess ? `Successfully performed action.` : `Attempted action.`;
  }

  return { module, action, details };
};

export const auditLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Only log state-changing requests (POST, PUT, DELETE, PATCH)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase())) {
    const start = Date.now();
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';

    // Intercept res.json to capture response status and log after request completion
    const originalJson = res.json;
    res.json = function (bodyData: any): Response {
      res.json = originalJson; // Restore
      
      const responseJson = res.json(bodyData);
      
      // Run audit logger asynchronously so we do not block response delivery
      process.nextTick(async () => {
        try {
          const status = res.statusCode;

          // Exclude direct logs fetches and authentication requests (login, logout, etc.)
          if (
            req.originalUrl.includes('/api/logs') || 
            req.originalUrl.includes('/api/activity-logs') ||
            req.originalUrl.includes('/api/auth')
          ) {
            return;
          }

          const { module, action, details } = getFriendlyAuditLog(req, status, bodyData);

          const userId = req.user?.id || null;
          const userName = req.user?.name || bodyData?.user?.name || req.user?.email || req.body?.email || 'System';
          
          // Write log
          await logActivity({
            userId,
            userName,
            action,
            module,
            details,
            ipAddress,
          });
        } catch (err: any) {
          console.error(`Audit logging interceptor failure: ${err.message}`);
        }
      });

      return responseJson;
    };
  }
  next();
};
