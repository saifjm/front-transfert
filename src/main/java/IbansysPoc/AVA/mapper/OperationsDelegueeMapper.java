package IbansysPoc.AVA.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;

@Mapper(componentModel = "spring", uses = {BeneficiaireMapper.class, DocumentMapper.class, AvaMarcheMapper.class})
public interface OperationsDelegueeMapper {

    OuvertureDossierDTO toDTO(OperationsDeleguee entity);

    @Mapping(target = "beneficiaires", ignore = true)
    @Mapping(target = "documents", ignore = true)
    @Mapping(target = "avaMarche", ignore = true)
    OperationsDeleguee toEntity(OuvertureDossierDTO dto);

    // NEW: mapping direct depuis le MVT vers l'entité principale
    @Mapping(target = "beneficiaires", ignore = true)
    @Mapping(target = "documents", ignore = true)
    @Mapping(target = "avaMarche", ignore = true)
    OperationsDeleguee fromMvt(OperationsDelegueesMvt mvt);

    // NEW: update existing OperationsDeleguee fields from a MVT
    @Mapping(target = "beneficiaires", ignore = true)
    @Mapping(target = "documents", ignore = true)
    @Mapping(target = "avaMarche", ignore = true)
    void updateFromMvt(OperationsDelegueesMvt mvt, @MappingTarget OperationsDeleguee entity);

    List<OuvertureDossierDTO> toDTOList(List<OperationsDeleguee> entities);

    List<OperationsDeleguee> toEntityList(List<OuvertureDossierDTO> dtos);

    @Mapping(target = "beneficiaires", ignore = true)
    @Mapping(target = "documents", ignore = true)
    @Mapping(target = "avaMarche", ignore = true)
    void updateEntityFromDTO(OuvertureDossierDTO dto, @MappingTarget OperationsDeleguee entity);
}
