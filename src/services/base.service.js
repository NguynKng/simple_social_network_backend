/**
 * Base Service
 * Abstract class chứa business logic cơ bản cho tất cả services
 */

const { buildQuery, parseSort, parsePopulate } = require('../utils/database.util');

class BaseService {
  constructor(repository) {
    if (!repository) {
      throw new Error('Repository is required for service');
    }
    this.repository = repository;
  }

  /**
   * Lấy tất cả records
   */
  async getAll(filters = {}, options = {}) {
    const query = buildQuery(filters);
    const sort = parseSort(options.sort);
    const populate = parsePopulate(options.populate);

    return this.repository.findAll(query, {
      select: options.select || '',
      populate,
      sort,
      limit: options.limit || 0,
      skip: options.skip || 0
    });
  }

  /**
   * Lấy với pagination
   */
  async paginate(filters = {}, options = {}) {
    const query = buildQuery(filters);
    const sort = parseSort(options.sort);
    const populate = parsePopulate(options.populate);

    return this.repository.paginate(query, {
      page: options.page || 1,
      limit: options.limit || 10,
      sort,
      populate
    });
  }

  /**
   * Lấy một record theo ID
   */
  async getById(id, options = {}) {
    const populate = parsePopulate(options.populate);

    const record = await this.repository.findById(id, {
      select: options.select || '',
      populate
    });

    if (!record) {
      const error = new Error('Record not found');
      error.statusCode = 404;
      throw error;
    }

    return record;
  }

  /**
   * Lấy một record theo query
   */
  async getOne(filters = {}, options = {}) {
    const query = buildQuery(filters);
    const populate = parsePopulate(options.populate);

    const record = await this.repository.findOne(query, {
      select: options.select || '',
      populate
    });

    if (!record) {
      const error = new Error('Record not found');
      error.statusCode = 404;
      throw error;
    }

    return record;
  }

  /**
   * Tạo record mới
   */
  async create(data) {
    // Validate data trước khi tạo (có thể override trong child class)
    await this.validateCreate(data);

    const record = await this.repository.create(data);

    // Hook sau khi tạo (có thể override)
    await this.afterCreate(record);

    return record;
  }

  /**
   * Cập nhật record
   */
  async update(id, data) {
    // Check record tồn tại
    const existing = await this.repository.findById(id);
    if (!existing) {
      const error = new Error('Record not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate data trước khi update (có thể override)
    await this.validateUpdate(id, data, existing);

    const updated = await this.repository.update(id, data);

    // Hook sau khi update (có thể override)
    await this.afterUpdate(updated, existing);

    return updated;
  }

  /**
   * Xóa record
   */
  async delete(id) {
    // Check record tồn tại
    const existing = await this.repository.findById(id);
    if (!existing) {
      const error = new Error('Record not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate trước khi xóa (có thể override)
    await this.validateDelete(id, existing);

    const deleted = await this.repository.delete(id);

    // Hook sau khi xóa (có thể override)
    await this.afterDelete(deleted);

    return deleted;
  }

  /**
   * Soft delete record
   */
  async softDelete(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      const error = new Error('Record not found');
      error.statusCode = 404;
      throw error;
    }

    await this.validateDelete(id, existing);

    const deleted = await this.repository.delete(id); // Uses soft delete if available

    await this.afterDelete(deleted);

    return deleted;
  }

  /**
   * Restore record đã xóa
   */
  async restore(id) {
    const restored = await this.repository.restore(id);
    await this.afterRestore(restored);
    return restored;
  }

  /**
   * Kiểm tra record có tồn tại không
   */
  async exists(filters = {}) {
    const query = buildQuery(filters);
    return this.repository.exists(query);
  }

  /**
   * Đếm số records
   */
  async count(filters = {}) {
    const query = buildQuery(filters);
    return this.repository.count(query);
  }

  /**
   * Tạo nhiều records
   */
  async createMany(dataArray) {
    // Validate từng item
    for (const data of dataArray) {
      await this.validateCreate(data);
    }

    return this.repository.createMany(dataArray);
  }

  /**
   * Cập nhật nhiều records
   */
  async updateMany(filters = {}, data) {
    const query = buildQuery(filters);
    return this.repository.updateMany(query, data);
  }

  /**
   * Xóa nhiều records
   */
  async deleteMany(filters = {}) {
    const query = buildQuery(filters);
    return this.repository.deleteMany(query);
  }

  // ============================================
  // Validation hooks (override trong child class)
  // ============================================

  async validateCreate(_data) {
    // Override trong child class để thêm validation
    return true;
  }

  async validateUpdate(_id, _data, _existing) {
    // Override trong child class để thêm validation
    return true;
  }

  async validateDelete(_id, _existing) {
    // Override trong child class để thêm validation
    return true;
  }

  // ============================================
  // Lifecycle hooks (override trong child class)
  // ============================================

  async afterCreate(_record) {
    // Override trong child class để thực hiện actions sau khi tạo
    // Ví dụ: gửi email, log, cache, etc.
  }

  async afterUpdate(_updated, _original) {
    // Override trong child class
  }

  async afterDelete(_deleted) {
    // Override trong child class
  }

  async afterRestore(_restored) {
    // Override trong child class
  }

  // ============================================
  // Helper methods
  // ============================================

  /**
   * Build error với status code
   */
  createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  /**
   * Access repository trực tiếp (use carefully)
   */
  getRepository() {
    return this.repository;
  }
}

module.exports = BaseService;
