import { Request, Response, NextFunction } from 'express';
import Category from '../models/Category';
import Subcategory from '../models/Subcategory';
import { CategoryValidator } from '../validators';
import { AuthenticatedRequest } from '../types';

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const query: any = {};
    if (status === 'active') {
      query.status = { $ne: 'inactive' };
    } else if (status) {
      query.status = status;
    }

    const categories = await Category.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validatedBody = CategoryValidator.parse(req.body);

    const exists = await Category.findOne({ name: validatedBody.name });
    if (exists) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = new Category({
      ...validatedBody,
      status: validatedBody.status || 'active',
    });
    await category.save();

    res.status(201).json({ success: true, message: 'Category created successfully', category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedBody = CategoryValidator.parse(req.body);

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (validatedBody.name !== category.name) {
      const duplicateExists = await Category.findOne({ name: validatedBody.name });
      if (duplicateExists) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }

    category.name = validatedBody.name;
    category.color = validatedBody.color;
    category.icon = validatedBody.icon;
    category.status = validatedBody.status || category.status;

    await category.save();

    res.status(200).json({ success: true, message: 'Category updated successfully', category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await Category.findByIdAndDelete(id);
    await Subcategory.deleteMany({ category: id });

    res.status(200).json({ success: true, message: 'Category and all associated subcategories deleted successfully' });
  } catch (error) {
    next(error);
  }
};
