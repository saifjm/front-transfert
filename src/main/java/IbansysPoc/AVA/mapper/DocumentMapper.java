package IbansysPoc.AVA.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import IbansysPoc.AVA.DTO.DocumentDTO;
import IbansysPoc.AVA.entity.Document;

@Mapper(componentModel = "spring")
public interface DocumentMapper {

    DocumentDTO toDTO(Document entity);

    Document toEntity(DocumentDTO dto);

    List<DocumentDTO> toDTOList(List<Document> entities);

    List<Document> toEntityList(List<DocumentDTO> dtos);

    void updateEntityFromDTO(DocumentDTO dto, @MappingTarget Document entity);
}
