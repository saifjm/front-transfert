package IbansysPoc.AVA.mapper;

import IbansysPoc.AVA.DTO.ReservationOperationDTO;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ReservationOperationMapper {

    @Mapping(target = "reference", expression = "java(entity.getReferenceRes() != null ? entity.getReferenceRes() : null)")
    @Mapping(source = "origine", target = "origine")
    ReservationOperationDTO toDto(OperationsDelegueesMvt entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(source = "origine", target = "origine")
    OperationsDelegueesMvt toEntity(ReservationOperationDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(source = "origine", target = "origine")

    void updateEntityFromDto(ReservationOperationDTO dto, @MappingTarget OperationsDelegueesMvt entity);

    List<ReservationOperationDTO> toDtoList(List<OperationsDelegueesMvt> entities);

}
