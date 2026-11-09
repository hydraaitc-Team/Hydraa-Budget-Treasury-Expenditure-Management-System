import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, Body, Res, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Req() req: any) {
    return this.documentsService.uploadDocument(file, body, req.user.id);
  }

  @Get('record/:type/:id')
  getByRecord(@Param('type') type: any, @Param('id') id: string) {
    return this.documentsService.getDocumentsForRecord(type, Number(id));
  }

  @Get('download/:uid')
  async downloadFile(@Param('uid') uid: string, @Res() res: Response, @Req() req: any) {
    const { stream, doc } = await this.documentsService.getDocumentFile(uid, req.user.id);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalFilename}"`);
    stream.pipe(res);
  }

  @Get('view/:uid')
  async viewFile(@Param('uid') uid: string, @Res() res: Response, @Req() req: any) {
    const { stream, doc } = await this.documentsService.getDocumentFile(uid, req.user.id);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFilename}"`);
    stream.pipe(res);
  }
}

