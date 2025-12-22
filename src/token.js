export const generateToken = () =>
  "TKN-" + Date.now().toString().slice(-5);
