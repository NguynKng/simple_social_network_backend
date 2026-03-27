/**
 * Base Model Plugin
 * Thêm các fields và methods chung cho tất cả models
 */
const baseModelPlugin = (schema, options = {}) => {
  // Thêm timestamps tự động nếu chưa có
  if (!schema.path('createdAt')) {
    schema.add({
      createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
      }
    });
  }

  if (!schema.path('updatedAt')) {
    schema.add({
      updatedAt: {
        type: Date,
        default: Date.now
      }
    });
  }

  // Auto update updatedAt on save
  schema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
  });

  schema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
  });

  // Thêm isDeleted cho soft delete
  if (options.softDelete) {
    schema.add({
      isDeleted: {
        type: Boolean,
        default: false,
        index: true
      },
      deletedAt: {
        type: Date,
        default: null
      }
    });

    // Soft delete method
    schema.methods.softDelete = function() {
      this.isDeleted = true;
      this.deletedAt = new Date();
      return this.save();
    };

    // Restore method
    schema.methods.restore = function() {
      this.isDeleted = false;
      this.deletedAt = null;
      return this.save();
    };

    // Query helper để bỏ qua các documents đã xóa
    schema.query.notDeleted = function() {
      return this.where({ isDeleted: false });
    };

    // Mặc định không lấy các documents đã xóa
    if (options.autoExcludeDeleted !== false) {
      schema.pre(/^find/, function(next) {
        if (this.getOptions().includeDeleted !== true) {
          this.where({ isDeleted: false });
        }
        next();
      });
    }
  }

  // toJSON transform để xóa __v và biến _id thành id
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      
      // Xóa các sensitive fields nếu có
      if (options.hiddenFields) {
        options.hiddenFields.forEach(field => {
          delete ret[field];
        });
      }
      
      return ret;
    }
  });

  schema.set('toObject', {
    virtuals: true,
    versionKey: false
  });

  // Thêm static method để pagination
  schema.statics.paginate = async function(query = {}, options = {}) {
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const sort = options.sort || { createdAt: -1 };
    const select = options.select || '';

    const [data, total] = await Promise.all([
      this.find(query)
        .select(select)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(options.populate || [])
        .lean(),
      this.countDocuments(query)
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  };

  // Static method để tìm theo ID với error handling
  schema.statics.findByIdOrFail = async function(id, options = {}) {
    const doc = await this.findById(id).populate(options.populate || []);
    if (!doc) {
      const error = new Error(`${this.modelName} not found`);
      error.statusCode = 404;
      throw error;
    }
    return doc;
  };

  // Method để kiểm tra field có thay đổi không
  schema.methods.isModifiedField = function(field) {
    return this.isModified(field);
  };

  // Index cho performance
  if (options.timestamps !== false) {
    schema.index({ createdAt: -1 });
    schema.index({ updatedAt: -1 });
  }
};

module.exports = baseModelPlugin;
