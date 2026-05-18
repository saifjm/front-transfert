package IbansysPoc.AVA.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import IbansysPoc.AVA.DTO.OperationExportateurAVADTO;
import IbansysPoc.AVA.entity.OperationExportateurAVA;

@Mapper(componentModel = "spring")
public interface OperationExportateurAVAMapper {

    @Mapping(source = "noCompte", target = "numeroCompte")
    OperationExportateurAVADTO toDTO(OperationExportateurAVA entity);

    @Mapping(source = "numeroCompte", target = "noCompte")
    OperationExportateurAVA toEntity(OperationExportateurAVADTO dto);
}
