import { CredentialsSignin } from 'next-auth';

export class InvalidCredentialsError extends CredentialsSignin {
  code = 'invalid_credentials';
}

export class UserDisabledError extends CredentialsSignin {
  code = 'account_disabled';
}

export class OAuthAccountError extends CredentialsSignin {
  code = 'oauth_account_only';
}

export class NoOrganizationError extends CredentialsSignin {
  code = 'no_organization_assigned';
}
