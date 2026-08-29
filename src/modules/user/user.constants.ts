// `import type` is erased at compile time — TypeScript uses the type, the built JS does not import it for values.
import type { StrongPasswordOptions } from 'validator';

enum UserGender {
  Female = 'female',
  Male = 'male',
  Other = 'other',
}

// Feed matching: men and/or women only. Profile gender can still be `other`.
enum UserInterest {
  Female = 'female',
  Male = 'male',
}

enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

enum MovieNightStyle {
  CouchRewatch = 'couch-rewatch',
  CrowdedFirstDay = 'crowded-first-day',
  SilentSubtitles = 'silent-subtitles',
  TheatreInterval = 'theatre-interval',
}

enum WeekdayPace {
  NightShiftBrain = 'night-shift-brain',
  PackedCalendar = 'packed-calendar',
  SlowMorning = 'slow-morning',
  SplitShift = 'split-shift',
}

enum SocialBattery {
  CrowdFirst = 'crowd-first',
  OneOnOne = 'one-on-one',
  QuietHome = 'quiet-home',
  SmallCircle = 'small-circle',
}

enum HomeEnergy {
  AlwaysSomeoneOver = 'always-someone-over',
  EmptyFlatPeace = 'empty-flat-peace',
  HotelMode = 'hotel-mode',
  PlantsAndGuests = 'plants-and-guests',
}

enum NoiseComfort {
  HonkingOkay = 'honking-okay',
  NeedQuietBlock = 'need-quiet-block',
  RainOnWindowOnly = 'rain-on-window-only',
}

enum FoodCourage {
  HomeCookAlways = 'home-cook-always',
  Mixed = 'mixed',
  ReservationOnly = 'reservation-only',
  StreetStallFirst = 'street-stall-first',
}

enum FamilyOrbit {
  ChosenFamily = 'chosen-family',
  FarButWarm = 'far-but-warm',
  SameBuilding = 'same-building',
  WeeklyCall = 'weekly-call',
}

enum SleepWindow {
  DawnPerson = 'dawn-person',
  MidnightOil = 'midnight-oil',
  SplitSleep = 'split-sleep',
  WheneverTheWorkEnds = 'whenever-the-work-ends',
}

const defaultMalePhotoUrl =
  'https://media.istockphoto.com/id/1223477625/vector/male-default-avatar-profile-icon-man-face-silhouette-person-placeholder-vector-illustration.jpg?s=170667a&w=0&k=20&c=CrHRmkAACHQyNhv-f3Mj_PpO5WLFJlXcL2QcUlYByP4=';

const defaultFemalePhotoUrl =
  'https://cdn.vectorstock.com/i/1000v/14/18/default-female-avatar-profile-picture-icon-grey-vector-34511418.jpg';

const strongPasswordValidationOptions = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
} satisfies StrongPasswordOptions;

const userPasswordMaxLength = 32;

const strongPasswordMessage = `Password must be at least ${String(strongPasswordValidationOptions.minLength)} characters and include at least ${String(strongPasswordValidationOptions.minUppercase)} uppercase letter, ${String(strongPasswordValidationOptions.minLowercase)} lowercase letter, ${String(strongPasswordValidationOptions.minNumbers)} number, and ${String(strongPasswordValidationOptions.minSymbols)} symbol`;

const strongPasswordMinLengthMessage = `Password must be at least ${String(strongPasswordValidationOptions.minLength)} characters long`;

const userPasswordMaxLengthMessage = `Password must be less than ${String(userPasswordMaxLength)} characters`;

const userBioMaxLength = 500;
const userJobTitleMaxLength = 80;
const userCityMaxLength = 80;
const userComfortMovieMaxLength = 80;
const userCurrentlyWatchingMaxLength = 120;
const userSundayRitualMaxLength = 200;
const userCityTheyMissMaxLength = 80;
const userConversationFuelMaxLength = 200;
const userCurrentlyObsessedMaxLength = 120;
const userOffscreenHobbyMaxLength = 80;
const userFirstDateSettingMaxLength = 200;
const userPlaylistWeatherMaxLength = 80;
const userPhotosMaxCount = 6;
const userMinimumAge = 18;
const preferenceDefaultMaxAge = 99;
const preferenceDefaultMaxDistanceKm = 80;

export const UserConstantsCollection = {
  UserGender,
  UserInterest,
  UserRole,
  MovieNightStyle,
  WeekdayPace,
  SocialBattery,
  HomeEnergy,
  NoiseComfort,
  FoodCourage,
  FamilyOrbit,
  SleepWindow,
  defaultMalePhotoUrl,
  defaultFemalePhotoUrl,
  strongPasswordValidationOptions,
  userPasswordMaxLength,
  strongPasswordMessage,
  strongPasswordMinLengthMessage,
  userPasswordMaxLengthMessage,
  userBioMaxLength,
  userJobTitleMaxLength,
  userCityMaxLength,
  userComfortMovieMaxLength,
  userCurrentlyWatchingMaxLength,
  userSundayRitualMaxLength,
  userCityTheyMissMaxLength,
  userConversationFuelMaxLength,
  userCurrentlyObsessedMaxLength,
  userOffscreenHobbyMaxLength,
  userFirstDateSettingMaxLength,
  userPlaylistWeatherMaxLength,
  userPhotosMaxCount,
  userMinimumAge,
  preferenceDefaultMaxAge,
  preferenceDefaultMaxDistanceKm,
};
