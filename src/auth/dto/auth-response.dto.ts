import { Role } from '@prisma/client';

export class AuthUserDto {
  id: string;
  email: string;
  username: string;
  role: Role;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
}
