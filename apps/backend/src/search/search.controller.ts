import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('universal')
  search(
    @Query('q') q?: string,
    @Query('tokenNumber') tokenNumber?: string,
    @Query('chequeNumber') chequeNumber?: string,
    @Query('utrNumber') utrNumber?: string,
    @Query('billNo') billNo?: string,
    @Query('invoiceNo') invoiceNo?: string,
    @Query('vendorName') vendorName?: string,
  ) {
    return this.searchService.search(q || '', {
      tokenNumber,
      chequeNumber,
      utrNumber,
      billNo,
      invoiceNo,
      vendorName,
    });
  }
}
