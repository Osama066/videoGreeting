const mongoose = require('mongoose');

const configSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const DEFAULT_GREETING_TEMPLATE =
  'Hello {name}! Thank you for connecting with us. We are thrilled to welcome you and look forward to building wonderful experiences together!';

let inMemoryConfig = {
  greetingTemplate: DEFAULT_GREETING_TEMPLATE,
};

const Config = mongoose.models.Config || mongoose.model('Config', configSchema);

module.exports = {
  Config,
  DEFAULT_GREETING_TEMPLATE,
  inMemoryConfig,
};
