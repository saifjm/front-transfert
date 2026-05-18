package IbansysPoc.AVA.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import IbansysPoc.AVA.DTO.BeneficiaireMvtDTO;
import IbansysPoc.AVA.entity.BeneficiairesMvt;

@Mapper(componentModel = "spring")
public interface BeneficiaireMvtMapper {

    BeneficiaireMvtDTO toDTO(BeneficiairesMvt entity);


    BeneficiairesMvt toEntity(BeneficiaireMvtDTO dto);

    List<BeneficiaireMvtDTO> toDTOList(List<BeneficiairesMvt> entities);


    List<BeneficiairesMvt> toEntityList(List<BeneficiaireMvtDTO> dtos);

    void updateEntityFromDTO(BeneficiaireMvtDTO dto, @MappingTarget BeneficiairesMvt entity);
}

