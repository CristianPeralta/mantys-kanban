import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user. Password hashing is handled by UsersService.create().
   * Returns the created user without the password field.
   */
  async register(dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /**
   * Validate email + password credentials.
   * Returns the user object (without password) or throws UnauthorizedException.
   */
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pwd, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Validate credentials and return a signed JWT access token with user data.
   */
  async login(dto: LoginDto): Promise<{ accessToken: string; user: Record<string, unknown> }> {
    const user = await this.validateUser(dto.email, dto.password);
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken: token, user };
  }
}
