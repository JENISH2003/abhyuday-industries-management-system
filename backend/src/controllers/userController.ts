import { Response, NextFunction } from 'express';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { AuthenticatedRequest } from '../types';

export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const search = (req.query.search as string || '').trim();

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const formattedUsers = users.map((u) => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    res.status(200).json({
      success: true,
      users: formattedUsers,
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

export const changeUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect Super Admin from being blocked
    if (user.role === 'super_admin') {
      return res.status(400).json({ message: 'Action denied: Cannot block Super Admin account' });
    }

    user.status = status;
    await user.save();

    // Immediately revoke all active refresh token sessions for blocked users
    if (status === 'blocked') {
      await RefreshToken.deleteMany({ user: user._id });
    }

    res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      user: { id: user._id, name: user.name, status: user.status },
    });
  } catch (error) {
    next(error);
  }
};

export const changeUserRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const assignableRoles = ['admin', 'manager', 'user'];
    if (!assignableRoles.includes(role)) {
      if (role === 'super_admin') {
        return res.status(400).json({ message: 'Action denied: System lock active. There can only be 1 primary Super Admin account.' });
      }
      return res.status(400).json({ message: `Invalid role value. Must be one of: ${assignableRoles.join(', ')}` });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // System Lock: Protect existing Super Admin role from being changed
    if (user.role === 'super_admin') {
      return res.status(400).json({ message: 'Action denied: Primary Super Admin account role is locked' });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role successfully updated to ${role}`,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect Super Admin from deletion
    if (user.role === 'super_admin') {
      return res.status(400).json({ message: 'Action denied: Cannot delete Super Admin account' });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
