import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('calls $connect on module init', async () => {
      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls $disconnect on module destroy', async () => {
      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
