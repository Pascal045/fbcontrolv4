import { firebaseAuth } from '../client-packages/firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { IUser, ROLE } from '../interfaces/user.interface';
import { UserService } from './user.service';
import { clearStore, store } from '../redux/store';
import { userLogin } from '../redux/actions/user.actions';

export class AuthService {

  static async register(email: string, password: string, name: string): Promise<IUser | undefined> {
    let userCred = undefined;
    try {
      userCred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error) {
      console.error('Error by user registration:', error);
      throw new Error(error);
    }
    if (userCred.user.email) {
      const userData = {
        id: userCred.user.uid,
        name,
        email: userCred.user.email,
        createdAt: userCred.user.metadata.creationTime,
        role: ROLE.USER
      }
      const user = await UserService.create(userData);
      store.dispatch(userLogin(user))
      return user;
    } else {
      return undefined;
    }
  }
  
  static async login(email: string, password: string): Promise<IUser | undefined> {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const user = await UserService.getUser(cred.user.uid);
    if (user) {
      store.dispatch(userLogin(user));
      return user;
    } else {
      return undefined;
    }
  }
  
  static async logout(): Promise<boolean> {
    try {
      await signOut(firebaseAuth);
      store.dispatch(clearStore());
      return true;
    } catch (error) {
      console.error('Error by log out:', error);
      return false;
    }
  }
}