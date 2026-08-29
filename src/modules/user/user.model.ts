import mongoose from 'mongoose';
// `import type` is erased at compile time — TypeScript uses the type, the built JS does not import it for values.
import type { InferSchemaType } from 'mongoose';
// Node needs a real file extension in imports (browsers/bundlers often hide this).

import validator from 'validator';
import { UserConstantsCollection } from './user.constants.ts';

interface ComputeAgeInput {
  birthDate: Date;
}

const isHttpUrl = (value: string) => validator.isURL(value, { require_protocol: true });

const computeAge = ({ birthDate }: ComputeAgeInput) => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
};

const photoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Photo URL is required'],
      trim: true,
      validate: {
        validator: isHttpUrl,
        message: 'Please enter a valid photo URL',
      },
    },
    sortOrder: {
      type: Number,
      required: [true, 'Photo sort order is required'],
      min: [0, 'Photo sort order cannot be negative'],
    },
  },
  { _id: false },
);

const preferencesSchema = new mongoose.Schema(
  {
    minAge: {
      type: Number,
      min: [UserConstantsCollection.userMinimumAge, 'Minimum age must be at least 18'],
      default: UserConstantsCollection.userMinimumAge,
    },
    maxAge: {
      type: Number,
      min: [UserConstantsCollection.userMinimumAge, 'Maximum age must be at least 18'],
      default: UserConstantsCollection.preferenceDefaultMaxAge,
    },
    maxDistanceKm: {
      type: Number,
      min: [1, 'Distance must be at least 1 km'],
      default: UserConstantsCollection.preferenceDefaultMaxDistanceKm,
    },
  },
  { _id: false },
);

// Mongoose binds the nested preferences document as `this`. An arrow would not see maxAge.
preferencesSchema.path('minAge').validate(function doesNotExceedMaxAge(minAge: number) {
  if (!minAge || !this.maxAge) {
    return true;
  }

  return minAge <= this.maxAge;
}, 'Minimum age cannot be greater than maximum age');

const cinemaSchema = new mongoose.Schema(
  {
    comfortMovie: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userComfortMovieMaxLength,
        `Comfort movie must be at most ${String(UserConstantsCollection.userComfortMovieMaxLength)} characters`,
      ],
    },
    currentlyWatching: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userCurrentlyWatchingMaxLength,
        `Currently watching must be at most ${String(UserConstantsCollection.userCurrentlyWatchingMaxLength)} characters`,
      ],
    },
    movieNightStyle: {
      type: String,
      enum: {
        values: Object.values(UserConstantsCollection.MovieNightStyle),
        message: '{VALUE} is not a valid movie night style',
      },
    },
  },
  { _id: false },
);

const lifestyleSchema = new mongoose.Schema(
  {
    homeEnergy: {
      type: String,
      enum: {
        values: Object.values(UserConstantsCollection.HomeEnergy),
        message: '{VALUE} is not a valid home energy',
      },
    },
    sleepWindow: {
      type: String,
      enum: {
        values: Object.values(UserConstantsCollection.SleepWindow),
        message: '{VALUE} is not a valid sleep window',
      },
    },
    socialBattery: {
      type: String,
      enum: {
        values: Object.values(UserConstantsCollection.SocialBattery),
        message: '{VALUE} is not a valid social battery',
      },
    },
    sundayRitual: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userSundayRitualMaxLength,
        `Sunday ritual must be at most ${String(UserConstantsCollection.userSundayRitualMaxLength)} characters`,
      ],
    },
    weekdayPace: {
      type: String,
      enum: {
        values: Object.values(UserConstantsCollection.WeekdayPace),
        message: '{VALUE} is not a valid weekday pace',
      },
    },
  },
  { _id: false },
);

const cityLifeSchema = new mongoose.Schema(
  {
    cityTheyMiss: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userCityTheyMissMaxLength,
        `City they miss must be at most ${String(UserConstantsCollection.userCityTheyMissMaxLength)} characters`,
      ],
    },
    foodCourage: {
      type: String,
      enum: {
        values: Object.values(UserConstantsCollection.FoodCourage),
        message: '{VALUE} is not a valid food courage',
      },
    },
    noiseComfort: {
      type: String,
      enum: {
        values: Object.values(UserConstantsCollection.NoiseComfort),
        message: '{VALUE} is not a valid noise comfort',
      },
    },
  },
  { _id: false },
);

const textureSchema = new mongoose.Schema(
  {
    conversationFuel: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userConversationFuelMaxLength,
        `Conversation fuel must be at most ${String(UserConstantsCollection.userConversationFuelMaxLength)} characters`,
      ],
    },
    currentlyObsessed: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userCurrentlyObsessedMaxLength,
        `Current obsession must be at most ${String(UserConstantsCollection.userCurrentlyObsessedMaxLength)} characters`,
      ],
    },
    familyOrbit: {
      type: String,
      enum: {
        values: Object.values(UserConstantsCollection.FamilyOrbit),
        message: '{VALUE} is not a valid family orbit',
      },
    },
    firstDateSetting: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userFirstDateSettingMaxLength,
        `First date setting must be at most ${String(UserConstantsCollection.userFirstDateSettingMaxLength)} characters`,
      ],
    },
    offscreenHobby: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userOffscreenHobbyMaxLength,
        `Offscreen hobby must be at most ${String(UserConstantsCollection.userOffscreenHobbyMaxLength)} characters`,
      ],
    },
    playlistWeather: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userPlaylistWeatherMaxLength,
        `Playlist weather must be at most ${String(UserConstantsCollection.userPlaylistWeatherMaxLength)} characters`,
      ],
    },
  },
  { _id: false },
);

const lifeSchema = new mongoose.Schema(
  {
    cinema: { type: cinemaSchema },
    cityLife: { type: cityLifeSchema },
    lifestyle: { type: lifestyleSchema },
    texture: { type: textureSchema },
  },
  { _id: false },
);

// A schema is Mongoose's blueprint for one MongoDB collection: field names, types, and rules.

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minLength: 2,
      maxLength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: 'Please enter a valid email address',
      },
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: [
        UserConstantsCollection.strongPasswordValidationOptions.minLength,
        UserConstantsCollection.strongPasswordMinLengthMessage,
      ],
      maxlength: [
        UserConstantsCollection.userPasswordMaxLength,
        UserConstantsCollection.userPasswordMaxLengthMessage,
      ],
      validate: {
        // OTP accounts have no password yet. Skip strength rules when the field is empty.
        // `isStrongPassword` returns true/false. It does not throw, so Mongoose
        // uses `message` (built from `strongPasswordOptions`) when this is false.
        validator: (value: string) => {
          if (!value) {
            return true;
          }

          return validator.isStrongPassword(
            value,
            UserConstantsCollection.strongPasswordValidationOptions,
          );
        },
        message: UserConstantsCollection.strongPasswordMessage,
      },
      // `select: false` hides this path from `find` / `findById`. Mongo still stores it.
      // Load it on purpose with `.select('+password')`.
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserConstantsCollection.UserRole),
        message: '{VALUE} is not a valid role',
      },
      default: UserConstantsCollection.UserRole.USER,
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, 'Phone number must be 10 digits'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: {
        values: Object.values(UserConstantsCollection.UserGender),
        // Mongoose replaces `{VALUE}` with whatever was sent (not a JS template string).
        message: '{VALUE} is not a valid gender type',
      },
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [UserConstantsCollection.userMinimumAge, 'Age must be at least 18'],
    },
    birthDate: {
      type: Date,
      validate: {
        validator: (value: Date) =>
          computeAge({ birthDate: value }) >= UserConstantsCollection.userMinimumAge,
        message: 'You must be at least 18 years old',
      },
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userBioMaxLength,
        `Bio must be at most ${String(UserConstantsCollection.userBioMaxLength)} characters`,
      ],
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [
        UserConstantsCollection.userJobTitleMaxLength,
        `Job title must be at most ${String(UserConstantsCollection.userJobTitleMaxLength)} characters`,
      ],
    },
    photoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: isHttpUrl,
        message: 'Please enter a valid photo URL',
      },
      default: function defaultPhotoByGender(this: {
        gender?: (typeof UserConstantsCollection.UserGender)[keyof typeof UserConstantsCollection.UserGender];
      }) {
        // Mongoose calls this with the document as `this`. An arrow would not see `gender`.
        if (this.gender === UserConstantsCollection.UserGender.Male) {
          return UserConstantsCollection.defaultMalePhotoUrl;
        }

        if (this.gender === UserConstantsCollection.UserGender.Female) {
          return UserConstantsCollection.defaultFemalePhotoUrl;
        }

        return undefined;
      },
    },
    photos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: (value: { url: string; sortOrder: number }[]) =>
          value.length <= UserConstantsCollection.userPhotosMaxCount,
        message: `You can add at most ${String(UserConstantsCollection.userPhotosMaxCount)} photos`,
      },
    },
    location: {
      city: {
        type: String,
        trim: true,
        maxlength: [
          UserConstantsCollection.userCityMaxLength,
          `City must be at most ${String(UserConstantsCollection.userCityMaxLength)} characters`,
        ],
      },
    },
    interestedIn: {
      type: [
        {
          type: String,
          enum: {
            values: Object.values(UserConstantsCollection.UserInterest),
            message: '{VALUE} is not a valid interest',
          },
        },
      ],
      default: [],
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({
        minAge: UserConstantsCollection.userMinimumAge,
        maxAge: UserConstantsCollection.preferenceDefaultMaxAge,
        maxDistanceKm: UserConstantsCollection.preferenceDefaultMaxDistanceKm,
      }),
    },
    life: {
      type: lifeSchema,
    },
    isSeededProfile: {
      type: Boolean,
      required: true,
      immutable: true,
      select: false,
    },
  },
  {
    timestamps: true,
    // When we send a user in the API (`res.json`), Mongoose uses toJSON.
    toJSON: {
      // virtuals: extra fields Mongoose computes. `id` is one of them:
      // the same value as Mongo `_id`, written as a normal string.
      virtuals: true,
      // `__v` is Mongo's internal edit counter. The frontend does not need it.
      versionKey: false,
      // Last step before JSON leaves the server.
      // Drop `_id` (keep string `id`) and `password` even if we loaded the hash to verify login.
      transform: (_doc, ret: { _id?: mongoose.Types.ObjectId; password?: string | null }) => {
        delete ret._id;
        delete ret.password;
        return ret;
      },
    },
  },
);

// Mongoose binds the document as `this`. An arrow would not see birthDate or photos.
userSchema.pre('validate', function syncAgeAndPrimaryPhoto() {
  if (this.birthDate) {
    this.age = computeAge({ birthDate: this.birthDate });
  }

  if (this.photoUrl || !this.photos.length) {
    return;
  }

  const orderedPhotos = [...this.photos].sort((left, right) => left.sortOrder - right.sortOrder);
  const primaryPhoto = orderedPhotos[0];

  if (primaryPhoto?.url) {
    this.photoUrl = primaryPhoto.url;
  }
});

export type UserFields = InferSchemaType<typeof userSchema> & {
  id: string;
};

// UserFields is the data (name, email, …). UserDocument is that Mongo row loaded in memory,
// so it also has Mongoose methods like `save` and `set`.
export type UserDocument = mongoose.HydratedDocumentFromSchema<typeof userSchema>;

export const User = mongoose.model('User', userSchema);
