export const checkStoreStatus = () => {
  // Temporarily always open
  return true;
  
  // Original schedule (commented out):
  // const now = new Date();
  // const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // const hour = now.getHours();
  // const minute = now.getMinutes();
  // const currentTime = hour * 60 + minute;

  // Mon-Fri: 7:00 AM – 9:00 PM (07:00 - 21:00) -> 420 - 1260
  // Sat-Sun: 8:00 AM – 10:00 PM (08:00 - 22:00) -> 480 - 1320

  // if (day >= 1 && day <= 5) {
  //   return currentTime >= 420 && currentTime < 1260;
  // } else {
  //   return currentTime >= 480 && currentTime < 1320;
  // }
};
