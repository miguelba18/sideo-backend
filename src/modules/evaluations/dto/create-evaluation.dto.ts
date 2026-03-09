import {
  IsBoolean, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, IsUUID, Max, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UsageTime { LOW = 1, MEDIUM = 2, HIGH = 3 }

export class ChairDto {
  @IsInt() @Min(1) @Max(3) seatHeight: number;
  @IsBoolean() seatHeightNoLegRoom: boolean;
  @IsBoolean() seatHeightNotAdjustable: boolean;

  @IsInt() @Min(1) @Max(2) seatDepth: number;
  @IsBoolean() seatDepthNotAdjustable: boolean;

  @IsInt() @Min(1) @Max(2) armrests: number;
  @IsBoolean() armrestsTooWide: boolean;
  @IsBoolean() armrestsSurfaceHard: boolean;
  @IsBoolean() armrestsNotAdjustable: boolean;

  @IsInt() @Min(1) @Max(2) backrest: number;
  @IsBoolean() backrestShouldersRaised: boolean;
  @IsBoolean() backrestNotAdjustable: boolean;

  @IsEnum(UsageTime) chairUsageTime: UsageTime;
}

export class ScreenDto {
  @IsInt() @Min(1) @Max(3) screen: number;
  @IsBoolean() screenTilted: boolean;
  @IsBoolean() screenDocumentsNoHolder: boolean;
  @IsBoolean() screenGlare: boolean;
  @IsBoolean() screenTooFar: boolean;
  @IsEnum(UsageTime) screenUsageTime: UsageTime;

  @IsInt() @Min(1) @Max(2) phone: number;
  @IsBoolean() phoneNeck: boolean;
  @IsBoolean() phoneNoHandsFree: boolean;
  @IsEnum(UsageTime) phoneUsageTime: UsageTime;
}

export class PeripheralsDto {
  @IsInt() @Min(1) @Max(2) mouse: number;
  @IsBoolean() mouseSmall: boolean;
  @IsBoolean() mouseDifferentHeight: boolean;
  @IsBoolean() mouseWristPressure: boolean;
  @IsEnum(UsageTime) mouseUsageTime: UsageTime;

  @IsInt() @Min(1) @Max(2) keyboard: number;
  @IsBoolean() keyboardWristDeviated: boolean;
  @IsBoolean() keyboardTooHigh: boolean;
  @IsBoolean() keyboardObjectsOverhead: boolean;
  @IsBoolean() keyboardNotAdjustable: boolean;
  @IsEnum(UsageTime) keyboardUsageTime: UsageTime;
}

export class CreateEvaluationDto {
  @IsUUID()
  employeeId: string;

  @ValidateNested()
  @Type(() => ChairDto)
  chair: ChairDto;

  @ValidateNested()
  @Type(() => ScreenDto)
  screen: ScreenDto;

  @ValidateNested()
  @Type(() => PeripheralsDto)
  peripherals: PeripheralsDto;

  @IsString()
  @IsOptional()
  observations?: string;
}   