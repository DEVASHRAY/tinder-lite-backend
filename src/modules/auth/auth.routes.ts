import { Router } from 'express';
import { authController } from './auth.controller.ts';

export const authRouter = Router();

authRouter.post('/otp/send', authController.sendOtp);

authRouter.post('/otp/login', authController.loginWithOtp);

authRouter.post('/otp/signup', authController.signupWithOtp);

authRouter.post('/signup', authController.signup);

authRouter.post('/signup/bulk', authController.signupBulk);

authRouter.post('/login', authController.login);

authRouter.post('/logout', authController.logout);
