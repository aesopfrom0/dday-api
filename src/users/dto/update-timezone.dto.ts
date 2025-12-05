import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateTimezoneDto {
  @IsString()
  @IsNotEmpty()
  timezone: string; // IANA timezone (예: 'Asia/Seoul', 'America/New_York')
}
