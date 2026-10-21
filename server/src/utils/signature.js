const crypto = require("crypto");

const getSecret = () => {
  return process.env.JWT_SECRET;
};

const signPacket = (data) => {
  return crypto
    .createHmac("sha256", getSecret())
    .update(JSON.stringify(data))
    .digest("hex");
};

const verifyPacket = (data, signature) => {
  const expectedSignature = signPacket(data);

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
};

module.exports = {
  signPacket,
  verifyPacket,
};