package IbansysPoc.AVA.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;
import IbansysPoc.AVA.DTO.BeneficiaireDTO;
import IbansysPoc.AVA.DTO.OperationAvaDTO;
import IbansysPoc.AVA.entity.*;

@Mapper(componentModel = "spring")
public interface OperationAvaMapper {

    @Mapping(source = "noCompte", target = "numeroCompte")
    OperationAvaDTO toDTO(OperationAva entity);

    @Mapping(source = "numeroCompte", target = "noCompte")
    OperationAva toEntity(OperationAvaDTO dto);
}