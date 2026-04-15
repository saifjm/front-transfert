package IbansysPoc.AVA.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import IbansysPoc.AVA.DTO.BeneficiaireDTO;
import IbansysPoc.AVA.entity.Beneficiaire;
import IbansysPoc.AVA.entity.BeneficiairesMvt;

@Mapper(componentModel = "spring")
public interface BeneficiaireMapper {

    @Mapping(source = "id.numDossier", target = "numDossier")
    @Mapping(source = "id.dateDossier", target = "dateDossier")
    @Mapping(source = "id.typePieceBenef", target = "typePieceBenef")
    @Mapping(source = "id.noPieceBenef", target = "noPieceBenef")
    BeneficiaireDTO toDTO(Beneficiaire entity);

    @Mapping(source = "numDossier", target = "id.numDossier")
    @Mapping(source = "dateDossier", target = "id.dateDossier")
    @Mapping(source = "typePieceBenef", target = "id.typePieceBenef")
    @Mapping(source = "noPieceBenef", target = "id.noPieceBenef")
    Beneficiaire toEntity(BeneficiaireDTO dto);
    List<BeneficiaireDTO> toDTOList(List<Beneficiaire> entities);
    List<Beneficiaire> toEntityList(List<BeneficiaireDTO> dtos);

    // ✅ AJOUT : mapping MVT -> cible
    Beneficiaire fromMvt(BeneficiairesMvt mvt);

    List<Beneficiaire> fromMvtList(List<BeneficiairesMvt> mvts);

    void updateEntityFromDTO(BeneficiaireDTO dto, @MappingTarget Beneficiaire entity);
}

