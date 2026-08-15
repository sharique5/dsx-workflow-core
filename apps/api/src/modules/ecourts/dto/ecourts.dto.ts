import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

/** CNR is a 16-char alphanumeric Case Number Record. */
const CNR_PATTERN = /^[A-Za-z0-9]{16}$/;

export class SearchCasesDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  advocates?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  litigants?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courtCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  caseTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  caseStatuses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actsAndSections?: string[];

  @IsOptional()
  @IsString()
  filingDateFrom?: string;

  @IsOptional()
  @IsString()
  filingDateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class LinkCaseDto {
  @Matches(CNR_PATTERN, {
    message: 'cnr must be a 16-character alphanumeric CNR',
  })
  cnr!: string;

  @IsOptional()
  @IsUUID()
  matterId?: string;
}
