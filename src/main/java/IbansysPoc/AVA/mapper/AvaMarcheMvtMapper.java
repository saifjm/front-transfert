package IbansysPoc.AVA.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import IbansysPoc.AVA.DTO.AvaMarcheMvtDTO;
import IbansysPoc.AVA.entity.AvaMarcheMvt;

@Mapper(componentModel = "spring")
public interface AvaMarcheMvtMapper {


    @Mapping(source = "id.numMarche", target = "numMarche")
    @Mapping(source = "id.codeProduitService", target = "codeProduitService")
    @Mapping(source = "id.codeOperation", target = "codeOperation")
    @Mapping(source = "id.refOperation", target = "refOperation")
    @Mapping(source = "id.dateOperation", target = "dateOperation")
    AvaMarcheMvtDTO toDTO(AvaMarcheMvt entity);


    @Mapping(source = "numMarche", target = "id.numMarche")
    @Mapping(source = "codeProduitService", target = "id.codeProduitService")
    @Mapping(source = "codeOperation", target = "id.codeOperation")
    @Mapping(source = "refOperation", target = "id.refOperation")
    @Mapping(source = "dateOperation", target = "id.dateOperation")
    AvaMarcheMvt toEntity(AvaMarcheMvtDTO dto);


    List<AvaMarcheMvtDTO> toDTOList(List<AvaMarcheMvt> entities);


    List<AvaMarcheMvt> toEntityList(List<AvaMarcheMvtDTO> dtos);


    @Mapping(source = "numMarche", target = "id.numMarche")
    @Mapping(source = "codeProduitService", target = "id.codeProduitService")
    @Mapping(source = "codeOperation", target = "id.codeOperation")
    @Mapping(source = "refOperation", target = "id.refOperation")
    @Mapping(source = "dateOperation", target = "id.dateOperation")
    void updateEntityFromDTO(AvaMarcheMvtDTO dto, @MappingTarget AvaMarcheMvt entity);
}

