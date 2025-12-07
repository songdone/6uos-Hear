
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Ensure data directory exists in real deployment
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

const Book = sequelize.define('Book', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  author: { type: DataTypes.STRING, defaultValue: 'Unknown' },
  narrator: { type: DataTypes.STRING },
  series: { type: DataTypes.STRING },
  seriesIndex: { type: DataTypes.FLOAT },
  tags: { type: DataTypes.JSON },
  description: { type: DataTypes.TEXT },
  coverUrl: { type: DataTypes.STRING },
  publishYear: { type: DataTypes.STRING },
  language: { type: DataTypes.STRING },
  duration: { type: DataTypes.FLOAT, defaultValue: 0 }, // Total seconds
  folderPath: { type: DataTypes.STRING, unique: true },
  metadataSource: { type: DataTypes.STRING },
  scrapeConfidence: { type: DataTypes.FLOAT, defaultValue: 0 },
  reviewNeeded: { type: DataTypes.BOOLEAN, defaultValue: false },
  ingestNotes: { type: DataTypes.TEXT },
  scrapeConfig: { type: DataTypes.JSON },
  lastReviewAt: { type: DataTypes.DATE }
});

const AudioFile = sequelize.define('AudioFile', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  filename: { type: DataTypes.STRING },
  path: { type: DataTypes.STRING },
  duration: { type: DataTypes.FLOAT },
  format: { type: DataTypes.STRING },
  trackNumber: { type: DataTypes.INTEGER },
  size: { type: DataTypes.INTEGER }
});

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true },
  passwordHash: { type: DataTypes.STRING },
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const PlaybackProgress = sequelize.define('PlaybackProgress', {
  currentTime: { type: DataTypes.FLOAT, defaultValue: 0 },
  isFinished: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastPlayedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  duration: { type: DataTypes.FLOAT, defaultValue: 0 }
});

// Relationships
Book.hasMany(AudioFile, { onDelete: 'CASCADE' });
AudioFile.belongsTo(Book);

User.belongsToMany(Book, { through: PlaybackProgress });
Book.belongsToMany(User, { through: PlaybackProgress });

Book.hasMany(PlaybackProgress, { onDelete: 'CASCADE' });
PlaybackProgress.belongsTo(Book);

const initDb = async () => {
  await sequelize.sync({ alter: true });
  await User.findOrCreate({ where: { username: 'local' }, defaults: { passwordHash: '', isAdmin: true } });
  console.log('[DB] Database synced successfully (no data wipe).');
};

module.exports = { sequelize, Book, AudioFile, User, PlaybackProgress, initDb };
