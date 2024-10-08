import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import * as bcrypt from 'bcryptjs';
import { CreateUserDTO } from './dtos/create-user.dto';
import { UserDTO } from './dtos/user.dto';
import { CreateWorkshopOwnerUserDTO } from './dtos/create-workshop-owner-user.dto';
import { CreateWorkshopDTO } from 'src/workshop/dtos/create-workshop.dto';
import { WorkshopEntity } from 'src/workshop/workshop.entity';
import { WorkshopDTO } from 'src/workshop/dtos/workshop.dto';
import { AddressEntity } from 'src/address/address.entity';
import { CreateAddressDTO } from 'src/address/dtos/create-address.dto';
import { AddressDTO } from 'src/address/dtos/address.dto';
import { UpdateUserDTO } from './dtos/update-user.dto';
import { LoginResponseDTO } from 'src/auth/dto/login-response.dto';
import { AuthService } from 'src/auth/auth.service';
import { ChangePasswordUserDTO } from './dtos/change-password-user.dto';

@Injectable()
export class UserService {
  private readonly saltRounds = 10;

  constructor(
    private readonly authService: AuthService,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkshopEntity)
    private readonly workshopEntity: Repository<WorkshopEntity>,
    @InjectRepository(AddressEntity)
    private readonly addressEntity: Repository<AddressEntity>,
  ) {}

  async list(): Promise<UserDTO[]> {
    const users = await this.userRepository.createQueryBuilder('user').leftJoinAndSelect('user.workshop', 'workshop').getMany();
    return users.map((u) => {
      const workshopDTO = u.workshop ? new WorkshopDTO(u.workshop.id, u.workshop.name, u.workshop.description, AddressDTO.constructorBasedOnEntity(u.workshop.address)) : null;

      return new UserDTO(u.id, u.name, u.email, u.phone, u.cpf, !!u.workshop_id, u.workshop ? u.workshop.id : null, workshopDTO, u.appointments);
    });
  }

  async create(data: CreateUserDTO): Promise<UserDTO> {
    const u = await this.userRepository.find({ where: { cpf: data.cpf } });
    if (u[0]) return null;

    const user = data;
    user.password = await bcrypt.hash(data.password, this.saltRounds);
    const userCreated = await this.userRepository.save(user);

    return new UserDTO(userCreated.id, userCreated.name, userCreated.email, userCreated.phone, userCreated.cpf, false);
  }

  async createWorkshopOwnerUser(data: CreateWorkshopOwnerUserDTO): Promise<UserDTO> {
    const userEntity = await this.userRepository.find({ where: { cpf: data.cpf } });
    if (userEntity[0]) return null;

    const address = new CreateAddressDTO(data.address_name, data.street, data.city, data.zip_code, data.state);
    const addressCreated = await this.addressEntity.save(address);

    const workshop = new CreateWorkshopDTO(data.workshop_name, data.workshop_description, addressCreated);
    const workshopCreated = await this.workshopEntity.save(workshop);

    const user = this.userRepository.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      password: await bcrypt.hash(data.password, this.saltRounds),
      workshop: workshopCreated,
    });

    const userCreated = await this.userRepository.save(user);

    return new UserDTO(userCreated.id, userCreated.name, userCreated.email, userCreated.phone, userCreated.cpf, true, userCreated.workshop_id, userCreated.workshop, userCreated.appointments);
  }

  async delete(userId: number): Promise<boolean> {
    const userEntity = await this.userRepository.findOne({ where: { id: userId } });
    if (!userEntity) return false;

    return !!(await this.userRepository.remove(userEntity));
  }
  async find(options?: FindManyOptions<UserEntity>): Promise<UserDTO | null> {
    const userEntity = await this.userRepository.findOne(options);
    if (userEntity)
      return new UserDTO(
        userEntity.id,
        userEntity.name,
        userEntity.email,
        userEntity.phone,
        userEntity.cpf,
        true,
        userEntity.workshop_id,
        userEntity.workshop_id
          ? new WorkshopDTO(userEntity.workshop.id, userEntity.workshop.name, userEntity.workshop.description, AddressDTO.constructorBasedOnEntity(userEntity.workshop.address))
          : null,
        userEntity.appointments,
      );
    return null;
  }

  async update(updateUserDTO: UpdateUserDTO): Promise<LoginResponseDTO | null> {
    const { name, id, cpf, email, phone } = updateUserDTO;
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      return null;
    }

    if (name) user.name = name;
    if (cpf) user.cpf = cpf;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    await this.userRepository.save(user);

    const userUpdated = await this.userRepository.findOne({
      where: { id },
      relations: ['workshop', 'appointments'],
    });

    const access_token = await this.authService.generateAccessToken(user);

    const loginResponse = new LoginResponseDTO(
      access_token,
      new UserDTO(userUpdated.id, userUpdated.name, userUpdated.email, userUpdated.phone, userUpdated.cpf, true, userUpdated.workshop_id, userUpdated.workshop, userUpdated.appointments),
    );

    return loginResponse;
  }
  async changePassword(changePassword: ChangePasswordUserDTO): Promise<UserDTO | null> {
    const { id, password } = changePassword;
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      return null;
    }

    user.password = await bcrypt.hash(password, this.saltRounds);

    await this.userRepository.save(user);

    const userUpdated = await this.userRepository.findOne({
      where: { id },
      relations: ['workshop', 'appointments'],
    });

    return new UserDTO(userUpdated.id, userUpdated.name, userUpdated.email, userUpdated.phone, userUpdated.cpf, true, userUpdated.workshop_id, userUpdated.workshop, userUpdated.appointments);
  }
}
