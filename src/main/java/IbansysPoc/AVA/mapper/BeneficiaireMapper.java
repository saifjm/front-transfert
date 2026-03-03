package IbansysPoc.AVA.mapper;

import java.util.List;

import IbansysPoc.AVA.entity.BeneficiairesMvt;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import IbansysPoc.AVA.DTO.BeneficiaireDTO;
import IbansysPoc.AVA.entity.Beneficiaire;

@Mapper(componentModel = "spring")
public interface BeneficiaireMapper {

    BeneficiaireDTO toDTO(Beneficiaire entity);
    Beneficiaire toEntity(BeneficiaireDTO dto);
    List<BeneficiaireDTO> toDTOList(List<Beneficiaire> entities);
    List<Beneficiaire> toEntityList(List<BeneficiaireDTO> dtos);

    // ✅ AJOUT : mapping MVT -> cible
    Beneficiaire fromMvt(BeneficiairesMvt mvt);

    List<Beneficiaire> fromMvtList(List<BeneficiairesMvt> mvts);

    void updateEntityFromDTO(BeneficiaireDTO dto, @MappingTarget Beneficiaire entity);
}

