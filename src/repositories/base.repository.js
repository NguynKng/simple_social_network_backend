/**
 * Base Repository
 * Abstract class chứa các CRUD operations cơ bản cho tất cả repositories
 */

const { isValidObjectId } = require('../utils/database.util');

class BaseRepository {
  constructor(model) {
    if (!model) {
      throw new Error('Model is required for repository');
    }
    this.model = model;
  }

  /**
   * Tìm tất cả documents
   */
  async findAll(query = {}, options = {}) {
    const {
      select = '',
      populate = [],
      sort = { createdAt: -1 },
      limit = 0,
      skip = 0
    } = options;

    return this.model
      .find(query)
      .select(select)
      .populate(populate)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean();
  }

  /**
   * Tìm với pagination
   */
  async paginate(query = {}, options = {}) {
    return this.model.paginate(query, options);
  }

  /**
   * Tìm một document
   */
  async findOne(query, options = {}) {
    const { select = '', populate = [] } = options;

    return this.model
      .findOne(query)
      .select(select)
      .populate(populate)
      .lean();
  }

  /**
   * Tìm theo ID
   */
  async findById(id, options = {}) {
    if (!isValidObjectId(id)) {
      return null;
    }

    const { select = '', populate = [] } = options;

    return this.model
      .findById(id)
      .select(select)
      .populate(populate)
      .lean();
  }

  /**
   * Tìm theo ID hoặc throw error
   */
  async findByIdOrFail(id, options = {}) {
    const doc = await this.findById(id, options);
    
    if (!doc) {
      const error = new Error(`${this.model.modelName} not found`);
      error.statusCode = 404;
      throw error;
    }

    return doc;
  }

  /**
   * Tạo document mới
   */
  async create(data) {
    const doc = await this.model.create(data);
    // Return Mongoose document instead of plain object
    // This allows calling model methods like toObject(), save(), etc.
    return doc;
  }

  /**
   * Tạo nhiều documents
   */
  async createMany(dataArray) {
    return this.model.insertMany(dataArray);
  }

  /**
   * Cập nhật một document
   */
  async update(id, data, options = {}) {
    if (!isValidObjectId(id)) {
      throw new Error('Invalid ID format');
    }

    const { new: returnNew = true } = options;

    const doc = await this.model
      .findByIdAndUpdate(id, data, { 
        new: returnNew, 
        runValidators: true 
      })
      .lean();

    if (!doc) {
      const error = new Error(`${this.model.modelName} not found`);
      error.statusCode = 404;
      throw error;
    }

    return doc;
  }

  /**
   * Cập nhật nhiều documents
   */
  async updateMany(query, data) {
    return this.model.updateMany(query, data);
  }

  /**
   * Xóa một document (soft delete nếu có)
   */
  async delete(id) {
    if (!isValidObjectId(id)) {
      throw new Error('Invalid ID format');
    }

    const doc = await this.model.findById(id);
    
    if (!doc) {
      const error = new Error(`${this.model.modelName} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Soft delete nếu model có method này
    if (typeof doc.softDelete === 'function') {
      await doc.softDelete();
      return doc.toObject();
    }

    // Hard delete
    await doc.remove();
    return doc.toObject();
  }

  /**
   * Xóa nhiều documents
   */
  async deleteMany(query) {
    return this.model.deleteMany(query);
  }

  /**
   * Soft delete nhiều documents
   */
  async softDeleteMany(query) {
    return this.model.updateMany(query, {
      isDeleted: true,
      deletedAt: new Date()
    });
  }

  /**
   * Restore document đã xóa
   */
  async restore(id) {
    if (!isValidObjectId(id)) {
      throw new Error('Invalid ID format');
    }

    const doc = await this.model.findById(id);
    
    if (!doc) {
      const error = new Error(`${this.model.modelName} not found`);
      error.statusCode = 404;
      throw error;
    }

    if (typeof doc.restore === 'function') {
      await doc.restore();
      return doc.toObject();
    }

    throw new Error('Restore method not available for this model');
  }

  /**
   * Kiểm tra document có tồn tại không
   */
  async exists(query) {
    const doc = await this.model.findOne(query).select('_id').lean();
    return !!doc;
  }

  /**
   * Đếm số documents
   */
  async count(query = {}) {
    return this.model.countDocuments(query);
  }

  /**
   * Aggregate
   */
  async aggregate(pipeline) {
    return this.model.aggregate(pipeline);
  }

  /**
   * Tìm một và cập nhật
   */
  async findOneAndUpdate(query, data, options = {}) {
    const { new: returnNew = true } = options;

    return this.model
      .findOneAndUpdate(query, data, { 
        new: returnNew, 
        runValidators: true 
      })
      .lean();
  }

  /**
   * Tìm một và xóa
   */
  async findOneAndDelete(query) {
    return this.model.findOneAndDelete(query).lean();
  }

  /**
   * Bulk write operations
   */
  async bulkWrite(operations) {
    return this.model.bulkWrite(operations);
  }

  /**
   * Tìm distinct values
   */
  async distinct(field, query = {}) {
    return this.model.distinct(field, query);
  }

  /**
   * Raw model access (use carefully)
   */
  getModel() {
    return this.model;
  }
}

module.exports = BaseRepository;
