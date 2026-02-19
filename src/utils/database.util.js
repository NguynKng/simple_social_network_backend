const mongoose = require('mongoose');

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const toObjectId = (id) => {
  if (!isValidObjectId(id)) {
    throw new Error('Invalid ObjectId format');
  }
  return new mongoose.Types.ObjectId(id);
};

const buildQuery = (filters = {}) => {
  const query = {};

  Object.keys(filters).forEach(key => {
    const value = filters[key];

    if (value === null || value === undefined || value === '') {
      return;
    }

    // Handle search (regex)
    if (key.endsWith('_search')) {
      const field = key.replace('_search', '');
      query[field] = { $regex: value, $options: 'i' };
      return;
    }

    // Handle range queries
    if (key.endsWith('_min')) {
      const field = key.replace('_min', '');
      if (!query[field]) query[field] = {};
      query[field].$gte = value;
      return;
    }

    if (key.endsWith('_max')) {
      const field = key.replace('_max', '');
      if (!query[field]) query[field] = {};
      query[field].$lte = value;
      return;
    }

    // Handle array contains
    if (key.endsWith('_in') && Array.isArray(value)) {
      const field = key.replace('_in', '');
      query[field] = { $in: value };
      return;
    }

    // Handle not equal
    if (key.endsWith('_ne')) {
      const field = key.replace('_ne', '');
      query[field] = { $ne: value };
      return;
    }

    // Default: exact match
    query[key] = value;
  });

  return query;
};

/**
 * Parse sort string (e.g., "-createdAt,name" => { createdAt: -1, name: 1 })
 */
const parseSort = (sortString) => {
  if (!sortString) {
    return { createdAt: -1 };
  }

  const sort = {};
  const fields = sortString.split(',');

  fields.forEach(field => {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      sort[trimmed.substring(1)] = -1;
    } else {
      sort[trimmed] = 1;
    }
  });

  return sort;
};

/**
 * Parse populate string
 */
const parsePopulate = (populateString) => {
  if (!populateString) {
    return [];
  }

  if (typeof populateString === 'string') {
    return populateString.split(',').map(field => field.trim());
  }

  return Array.isArray(populateString) ? populateString : [populateString];
};

/**
 * Sanitize query để tránh NoSQL injection
 */
const sanitizeQuery = (query) => {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  const sanitized = {};

  Object.keys(query).forEach(key => {
    const value = query[key];

    // Không cho phép $ operators từ user input
    if (key.startsWith('$')) {
      return;
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        sanitized[key] = value.map(sanitizeQuery);
      } else {
        // Kiểm tra các operators hợp lệ
        const validOps = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex'];
        const sanitizedValue = {};
        
        Object.keys(value).forEach(op => {
          if (validOps.includes(op)) {
            sanitizedValue[op] = value[op];
          }
        });
        
        sanitized[key] = Object.keys(sanitizedValue).length > 0 ? sanitizedValue : value;
      }
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
};

/**
 * Transaction helper
 */
const withTransaction = async (callback) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Batch insert với chunk size
 */
const batchInsert = async (Model, data, chunkSize = 1000) => {
  const results = [];
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const inserted = await Model.insertMany(chunk);
    results.push(...inserted);
  }
  
  return results;
};

/**
 * Aggregate với pagination
 */
const aggregateWithPagination = async (Model, pipeline = [], options = {}) => {
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const countPipeline = [...pipeline, { $count: 'total' }];
  const dataPipeline = [
    ...pipeline,
    { $skip: skip },
    { $limit: limit }
  ];

  const [data, countResult] = await Promise.all([
    Model.aggregate(dataPipeline),
    Model.aggregate(countPipeline)
  ]);

  const total = countResult.length > 0 ? countResult[0].total : 0;

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

/**
 * Soft delete multiple documents
 */
const softDeleteMany = async (Model, query) => {
  return Model.updateMany(query, {
    isDeleted: true,
    deletedAt: new Date()
  });
};

/**
 * Restore multiple documents
 */
const restoreMany = async (Model, query) => {
  return Model.updateMany(query, {
    isDeleted: false,
    deletedAt: null
  });
};

/**
 * Hard delete soft-deleted documents older than days
 */
const cleanupSoftDeleted = async (Model, daysOld = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - daysOld);

  return Model.deleteMany({
    isDeleted: true,
    deletedAt: { $lt: date }
  });
};

/**
 * Get field statistics
 */
const getFieldStats = async (Model, field) => {
  const stats = await Model.aggregate([
    {
      $group: {
        _id: null,
        min: { $min: `$${field}` },
        max: { $max: `$${field}` },
        avg: { $avg: `$${field}` },
        sum: { $sum: `$${field}` },
        count: { $sum: 1 }
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : null;
};

/**
 * Check if document exists
 */
const exists = async (Model, query) => {
  const doc = await Model.findOne(query).lean().select('_id');
  return !!doc;
};

/**
 * Generate unique slug
 */
const generateUniqueSlug = async (Model, baseSlug, fieldName = 'slug') => {
  let slug = baseSlug;
  let counter = 1;

  while (await exists(Model, { [fieldName]: slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

module.exports = {
  isValidObjectId,
  toObjectId,
  buildQuery,
  parseSort,
  parsePopulate,
  sanitizeQuery,
  withTransaction,
  batchInsert,
  aggregateWithPagination,
  softDeleteMany,
  restoreMany,
  cleanupSoftDeleted,
  getFieldStats,
  exists,
  generateUniqueSlug
};
