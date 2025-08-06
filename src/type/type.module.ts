import { Module } from '@nestjs/common';
import { TypeService } from './type.service';
import { TypeController } from './type.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Type, TypeSchema } from './entities/type.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Type.name,
        schema: TypeSchema,
      },
    ]),
  ],
  providers: [TypeService],
  controllers: [TypeController],
  exports: [TypeService]
})
export class TypeModule {}
