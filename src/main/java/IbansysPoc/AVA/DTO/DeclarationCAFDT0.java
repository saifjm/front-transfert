package IbansysPoc.AVA.DTO;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;



@Getter
@Setter
public class DeclarationCAFDT0 {


    private String noPieceClient;
    private float mntCaFiscalHT;
    private LocalDate dateDeclaration;

}
