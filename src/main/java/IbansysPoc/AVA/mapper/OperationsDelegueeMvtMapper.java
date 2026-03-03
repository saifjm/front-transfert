package IbansysPoc.AVA.mapper;

import java.util.List;

import org.mapstruct.*;

import IbansysPoc.AVA.DTO.InitiationOuvertureDTO;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;

@Mapper(componentModel = "spring", uses = {BeneficiaireMvtMapper.class, DocumentMapper.class, AvaMarcheMvtMapper.class})
public interface OperationsDelegueeMvtMapper {

    @Mapping(source = "id.refOperation", target = "refOperation")
    @Mapping(source = "id.dateOperation", target = "dateOperation")
    @Mapping(target = "numeroCompte", source = "numeroCompte")
    // Mapping des champs plats vers l'objet imbriqué banqueProvenance
    @Mapping(source = "codeBanqueProvenance", target = "banqueProvenance.codeBanqueProvenance")
    @Mapping(source = "mntAvance", target = "banqueProvenance.mntAvance")
    @Mapping(source = "mntUtilise", target = "banqueProvenance.mntUtilise")
    @Mapping(source = "mntAutorise", target = "banqueProvenance.mntAutorise")
    @Mapping(source = "mntAutoriseBct", target = "banqueProvenance.mntAutoriseBct")
    @Mapping(source = "solde", target = "banqueProvenance.solde")
    InitiationOuvertureDTO toDTO(OperationsDelegueesMvt entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "beneficiairesMvtListe", ignore = true)
    @Mapping(target = "documents", ignore = true)
    @Mapping(target = "avaMarcheMvt", ignore = true)
    @Mapping(target = "numeroCompte", source = "numeroCompte")
    // Mapping de l'objet banqueProvenance vers les champs plats de l'entité
    @Mapping(source = "banqueProvenance.codeBanqueProvenance", target = "codeBanqueProvenance")
    @Mapping(source = "banqueProvenance.mntAvance", target = "mntAvance")
    @Mapping(source = "banqueProvenance.mntUtilise", target = "mntUtilise")
    @Mapping(source = "banqueProvenance.mntAutorise", target = "mntAutorise")
    @Mapping(source = "banqueProvenance.mntAutoriseBct", target = "mntAutoriseBct")
    @Mapping(source = "banqueProvenance.solde", target = "solde")
    OperationsDelegueesMvt toEntity(InitiationOuvertureDTO dto);

    List<InitiationOuvertureDTO> toDTOList(List<OperationsDelegueesMvt> entities);

    List<OperationsDelegueesMvt> toEntityList(List<InitiationOuvertureDTO> dtos);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "beneficiairesMvtListe", ignore = true)
    @Mapping(target = "documents", ignore = true)
    @Mapping(target = "avaMarcheMvt", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "numeroCompte", source = "numeroCompte")
    // Pour l'update, propager les champs de banqueProvenance si présents
    @Mapping(source = "banqueProvenance.codeBanqueProvenance", target = "codeBanqueProvenance")
    @Mapping(source = "banqueProvenance.mntAvance", target = "mntAvance")
    @Mapping(source = "banqueProvenance.mntUtilise", target = "mntUtilise")
    @Mapping(source = "banqueProvenance.mntAutorise", target = "mntAutorise")
    @Mapping(source = "banqueProvenance.mntAutoriseBct", target = "mntAutoriseBct")
    @Mapping(source = "banqueProvenance.solde", target = "solde")
    void updateEntityFromDTO(InitiationOuvertureDTO dto, @MappingTarget OperationsDelegueesMvt entity);


}
