import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateClientCreditDto {
  @IsString()
  @IsNotEmpty()
  document_number: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  client_name?: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  original_sale_amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  related_exchange_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}