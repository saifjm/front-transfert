package IbansysPoc.AVA.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import IbansysPoc.AVA.DTO.ExportateurDTO;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;

/**
 * Mapper pour convertir entre ExportateurDTO et OperationsDelegueesMvt
 */
@Mapper(componentModel = "spring")
public interface ExportateurMapper {


    /**
     * Convertit un DTO en entité
     * @param dto le DTO source
     * @return l'entité mappée
     */
    @Mapping(target = "id.refOperation", source = "refOperation")
    @Mapping(target = "id.dateOperation", source = "dateOperation")
    @Mapping(target = "numMvtAva", source = "numMvtAva")
    @Mapping(target = "beneficiairesMvtListe", ignore = true)
    @Mapping(target = "documents", ignore = true)
    @Mapping(target = "avaMarcheMvt", ignore = true)
    @Mapping(target = "codeEtat", ignore = true)
    OperationsDelegueesMvt toEntity(ExportateurDTO dto);

    /**
     * Convertit une entité en DTO
     * @param entity l'entité source
     * @return le DTO mappé
     */
    @Mapping(target = "refOperation", source = "id.refOperation")
    @Mapping(target = "dateOperation", source = "id.dateOperation")
    @Mapping(target = "numMvtAva", source = "numMvtAva")
    @Mapping(target = "codeOrigine", ignore = true)
    @Mapping(target = "dateMvtAva", ignore = true)
    ExportateurDTO toDTO(OperationsDelegueesMvt entity);
}