import { IsString, IsEmail, IsOptional } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  identityToken: string;

  @IsString()
  @IsOptional()
  authorizationCode?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;
}
