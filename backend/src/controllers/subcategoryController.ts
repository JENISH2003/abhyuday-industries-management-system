import { Request, Response, NextFunction } from 'express';
import Subcategory from '../models/Subcategory';
import Category from '../models/Category';
import { SubcategoryValidator } from '../validators';
import { AuthenticatedRequest } from '../types';

export const getSubcategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, status } = req.query;
    const query: any = {};
    if (category) {
      query.category = category;
    }
    if (status === 'active') {
      query.status = { $ne: 'inactive' };
    } else if (status) {
      query.status = status;
    }

    const subcategories = await Subcategory.find(query).populate('category', 'name color icon').sort({ name: 1 });
    res.status(200).json({ success: true, subcategories });
  } catch (error) {
    next(error);
  }
};

export const createSubcategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validatedBody = SubcategoryValidator.parse(req.body);

    const categoryExists = await Category.findById(validatedBody.category);
    if (!categoryExists) {
      return res.status(404).json({ message: 'Parent category not found' });
    }

    const exists = await Subcategory.findOne({
      name: validatedBody.name,
      category: validatedBody.category,
    });
    if (exists) {
      return res.status(400).json({ message: 'Subcategory name already exists in this category' });
    }

    const subcategory = new Subcategory({
      ...validatedBody,
      status: validatedBody.status || 'active',
    });
    await subcategory.save();

    res.status(201).json({ success: true, message: 'Subcategory created successfully', subcategory });
  } catch (error) {
    next(error);
  }
};

export const updateSubcategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedBody = SubcategoryValidator.parse(req.body);

    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    if (validatedBody.name !== subcategory.name || validatedBody.category !== subcategory.category.toString()) {
      const duplicateExists = await Subcategory.findOne({
        name: validatedBody.name,
        category: validatedBody.category,
      });
      if (duplicateExists) {
        return res.status(400).json({ message: 'Subcategory name already exists in this category' });
      }
    }

    subcategory.name = validatedBody.name;
    subcategory.category = validatedBody.category as any;
    subcategory.status = validatedBody.status || subcategory.status;

    await subcategory.save();

    res.status(200).json({ success: true, message: 'Subcategory updated successfully', subcategory });
  } catch (error) {
    next(error);
  }
};

export const deleteSubcategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    await Subcategory.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (error) {
    next(error);
  }
};
