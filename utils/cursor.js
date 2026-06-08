const AppError = require('./appError');

// {
//  score:100,
//  createdAt:"2025-06-08",
//  id:"abc"
// }

function encodeCursor({ score, createdAt, id }) {
  //buffer Convert string into bytes -> convert to ASCII for every character
  return Buffer.from(
    JSON.stringify({
      score,
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
      id,
    }),
  ).toString('base64url');// convert the string into encoded version which is safe to put in URL. base64url is a variant of base64 encoding that replaces characters that are not URL-safe with URL-safe alternatives.
}

function decodeCursor(cursor) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!parsed.id || parsed.score === undefined || !parsed.createdAt) {
      throw new Error('Missing cursor fields');
    }
    return {
      score: Number(parsed.score),
      createdAt: new Date(parsed.createdAt),
      id: parsed.id,
    };
  } catch (error) {
    throw new AppError('Invalid cursor', 400);
  }
}

//When MongoDB sees:

// {
//  likesCount: {
//    $lt: 80
//  }
// }

// and there is an index on:

// {
//  likesCount:-1,
//  createdAt:-1
// }

// it can jump directly near:

// 80 likes region

// instead of scanning from the beginning.

// for posts sorted by score desc, createdAt desc, _id desc
// take cursor from client, decode it, and build MongoDB filter to get next page.

function buildScoreCursorFilter(cursor) {
  const decoded = decodeCursor(cursor);

  if (!decoded) {
    return {};
  }
  //$or -> Match ANY condition
  //$lt -> less than
  // as feed is sorted by score desc, createdAt desc, _id desc
  return {
    $or: [
      { score: { $lt: decoded.score } },
      { score: decoded.score, createdAt: { $lt: decoded.createdAt } },
      { score: decoded.score, createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
    ],
  };
}

//for latest posts sorted by createdAt desc, _id desc
function buildDateCursorFilter(cursor) {
  const decoded = decodeCursor(cursor);

  if (!decoded) {
    return {};
  }

  return {
    $or: [
      { createdAt: { $lt: decoded.createdAt } },
      { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
    ],
  };
}

//for trending posts sorted by likesCount desc, createdAt desc, _id desc
function buildLikesCursorFilter(cursor) {
  const decoded = decodeCursor(cursor);

  if (!decoded) {
    return {};
  }

  return {
    $or: [
      { likesCount: { $lt: decoded.score } },
      { likesCount: decoded.score, createdAt: { $lt: decoded.createdAt } },
      { likesCount: decoded.score, createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
    ],
  };
}

// This is just a JavaScript version of:
// buildScoreCursorFilter()
// Instead of MongoDB:

// Check in memory

// whether item comes after cursor.

function isAfterScoreCursor(item, cursor) {
  const decoded = decodeCursor(cursor);

  if (!decoded) {
    return true;
  }

  const createdAt = new Date(item.createdAt).getTime();
  const cursorCreatedAt = decoded.createdAt.getTime();
  const id = item.id?.toString() || item._id?.toString();

  return (
    item.score < decoded.score ||
    (item.score === decoded.score && createdAt < cursorCreatedAt) ||
    (item.score === decoded.score && createdAt === cursorCreatedAt && id < decoded.id)
  );
}

module.exports = {
  buildDateCursorFilter,
  buildLikesCursorFilter,
  buildScoreCursorFilter,
  decodeCursor,
  encodeCursor,
  isAfterScoreCursor,
};


// Whenever you have multiple sort fields:

// Primary Key
// Secondary Key
// Tertiary Key

// your cursor must contain:

// Primary Value
// Secondary Value
// Tertiary Value

// Otherwise pagination breaks.