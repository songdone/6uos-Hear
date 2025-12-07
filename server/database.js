
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
  description: { type: DataTypes.TEXT },
  coverUrl: { type: DataTypes.STRING },
  publishYear: { type: DataTypes.STRING },
  language: { type: DataTypes.STRING },
  duration: { type: DataTypes.FLOAT, defaultValue: 0 }, // Total seconds
  folderPath: { type: DataTypes.STRING, unique: true }
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
  lastPlayedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Relationships
Book.hasMany(AudioFile, { onDelete: 'CASCADE' });
AudioFile.belongsTo(Book);

User.belongsToMany(Book, { through: PlaybackProgress });
Book.belongsToMany(User, { through: PlaybackProgress });

const initDb = async () => {
  await sequelize.sync({ force: true });
  console.log('[DB] Database synced successfully.');
};

module.exports = { sequelize, Book, AudioFile, User, PlaybackProgress, initDb };
