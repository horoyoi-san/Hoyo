package dev.amizing25.srtool.objects;

import com.google.gson.annotations.SerializedName;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SRToolDataRsp {
    @SerializedName("status")
    private int status;

    @SerializedName("message")
    private String message;
}
