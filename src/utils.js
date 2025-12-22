export const adminPhones = ["+919528947520"];

export const isAdmin = (user) =>
  adminPhones.includes(user?.phoneNumber);
