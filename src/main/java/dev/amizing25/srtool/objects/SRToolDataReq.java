package dev.amizing25.srtool.objects;

import com.google.gson.annotations.SerializedName;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SRToolDataReq {
    @SerializedName("data")
    private SRToolData data;

    @SerializedName("username")
    private String username;

    @SerializedName("password")
    private String password;
}
