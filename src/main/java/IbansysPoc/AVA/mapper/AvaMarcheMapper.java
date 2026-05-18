package IbansysPoc.AVA.mapper;

import java.util.List;

import IbansysPoc.AVA.entity.AvaMarcheMvt;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import IbansysPoc.AVA.DTO.AvaMarcheDTO;
import IbansysPoc.AVA.entity.AvaMarche;

@Mapper(componentModel = "spring")
public interface AvaMarcheMapper {

    AvaMarcheDTO toDTO(AvaMarche entity);

    AvaMarche toEntity(AvaMarcheDTO dto);

    List<AvaMarcheDTO> toDTOList(List<AvaMarche> entities);

    List<AvaMarche> toEntityList(List<AvaMarcheDTO> dtos);

    void updateEntityFromDTO(AvaMarcheDTO dto, @MappingTarget AvaMarche entity);

    AvaMarche fromMvt(AvaMarcheMvt mvt);
}

