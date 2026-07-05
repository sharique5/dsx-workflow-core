import {
  IsString,
  IsOptional,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firmName?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string | null;

  /** CSS hex colour, e.g. #4f46e5 */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'primaryColor must be a valid hex colour, e.g. #4f46e5' })
  primaryColor?: string;

  /** CSS hex colour */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'secondaryColor must be a valid hex colour, e.g. #e0e7ff' })
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;
}
