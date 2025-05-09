import torch
import torch.nn as nn
import torch.nn.utils.prune
import torchvision.models as models
import torch.nn.functional as F
import onnx
from onnxconverter_common import float16

class MomentoModel(nn.Module):
    def __init__(self, num_classes=480, emb_size=512, return_embedding=False, use_backbone=True):
        super().__init__()
        self.return_embedding = return_embedding
        self.use_backbone = use_backbone

        backbone = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        backbone.fc = nn.Identity()
        self.backbone = backbone

        self.embedding = nn.Linear(2048, emb_size, bias=False)
        self.classifier = nn.Linear(emb_size, num_classes, bias=False)

    def forward(self, x, return_emb=False):
        if self.use_backbone:
            x = self.backbone(x)
        emb = self.embedding(x)
        emb = F.normalize(emb, p=2, dim=1)
        if self.return_embedding or return_emb:
            return emb
        return self.classifier(emb)


if __name__ == "__main__":
    model = MomentoModel(return_embedding=True)

    dict_path = ""
    model.load_state_dict(torch.load(dict_path))
    model.eval()

    model.classifier = nn.Identity()  

    dummy_input = torch.ones(1, 3, 256, 256)
    save_path = "MomentoRecognition32.onnx"

    torch.onnx.export(
        model,
        dummy_input,
        save_path,
        export_params=True,
        opset_version=17,
        input_names=["input"],
        output_names=["embedding"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "embedding": {0: "batch_size"}
        }
    )

    print(f"Exported model to {save_path}")

if __name__ == "__main__":
    load_path = ""
    save_path = "MomentoRecognition16.onnx"

    model = onnx.load(load_path)
    fp16_model = float16.convert_float_to_float16(model, keep_io_types=True)

    onnx.save(fp16_model, save_path)
    print(f"Exported optimized model to {save_path}")















