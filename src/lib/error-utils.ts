import { FirebaseError } from 'firebase/app';

/**
 * Converts Firebase authentication error codes into user-friendly error messages
 * @param error The error object from Firebase
 * @returns A user-friendly error message
 */
export const getFirebaseAuthErrorMessage = (error: any): string => {
    if (error instanceof FirebaseError) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again.';
            case 'auth/email-already-in-use':
                return 'This email address is already in use.';
            case 'auth/weak-password':
                return 'The password is too weak.';
            case 'auth/popup-closed-by-user':
                return 'The sign-in popup was closed before completion. Please try again.';
            case 'auth/invalid-email':
                return 'The email address is invalid.';
            case 'auth/account-exists-with-different-credential':
                return 'An account already exists with the same email address but different sign-in credentials.';
            case 'auth/operation-not-allowed':
                return 'This sign-in method is not enabled for this project.';
            case 'auth/requires-recent-login':
                return 'This operation requires recent authentication. Please log in again.';
            case 'auth/too-many-requests':
                return 'Too many unsuccessful login attempts. Please try again later.';
            default:
                return `An unexpected error occurred (${error.code}). Please try again.`;
        }
    }
    return error.message || 'An unexpected error occurred. Please try again.';
};